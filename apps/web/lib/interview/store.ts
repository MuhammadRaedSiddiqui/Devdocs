// lib/interview/store.ts
// Real AI streaming wired via lib/ai/stream.ts — supports Anthropic + OpenAI.
// Integration point remaining: persistToSupabase() (see prompt 3).
import { create } from "zustand";
import type { ChatMessage, DomainDefinition, DomainId, DomainPhase, ProjectContext, SchemaTables } from "@/lib/types";
import { DOMAINS, getActiveDomains, getOpener, generateDoc, buildFullDocument, nextDomainId } from "@/lib/interview/domains";
import { CARD_CHOICES } from "@/lib/interview/choices";
import { getActiveConfig, type AIProvider } from "@/lib/ai/provider";
import { streamAIResponse, type StreamErrorType } from "@/lib/ai/stream";
import { buildSystemPrompt } from "@/lib/ai/systemPrompt";

const DEFAULT_SCHEMA: SchemaTables = {
  users: [
    { field: "id",           type: "uuid",        note: "Primary key, auto-generated" },
    { field: "email",        type: "text",        note: "Unique, required" },
    { field: "display_name", type: "text",        note: "Optional" },
    { field: "created_at",   type: "timestamptz", note: "Auto-set on insert" },
  ],
};

// Shown when the user asks a schema help question — keeps the schema card
// visible and teaches without advancing the domain.
const HELP_RESPONSES = [
  "Here's what each field does:\n\n**id** — unique identifier, auto-generated, you never set this\n**email** — the login email, must be unique across all users\n**display_name** — optional, shown in the UI\n**created_at** — records when the account was created, automatically",
  "A **foreign key (FK)** links two tables. It means 'this row belongs to a row in another table'. If the parent is deleted, child rows are deleted automatically too (cascade delete).",
  "Use `timestamptz` over plain `timestamp`. It stores in UTC and your app converts to local time on read. Always prefer this.",
];

// Error messages shown in the chat when a stream fails
const ERROR_MESSAGES: Record<StreamErrorType, string> = {
  auth:       "Your API key was rejected. Go to **Settings → API Key** to update it.",
  rate_limit: "Rate limit reached. Wait a moment and try sending again.",
  timeout:    "The request timed out after 30 seconds. This can happen when the API is under load — try again.",
  network:    "Network error. Check your connection and try again.",
  unknown:    "An unexpected error occurred. Try again or check the provider's status page.",
};

export interface LastError {
  type: StreamErrorType;
  message: string;
  lastUserMessage: string;
}

interface InterviewState {
  // Core interview state
  lockedContext:    ProjectContext | null;
  lockedChoices:    Partial<Record<DomainId, Record<string, string>>>;
  domainPhases:     Record<DomainId, DomainPhase>;
  currentDomain:    DomainId;
  completedDomains: DomainId[];
  domainContent:    Partial<Record<DomainId, string>>;
  messages:         ChatMessage[];
  elaboration:      string;
  schemaTables:     SchemaTables;
  schemaConfirmed:  boolean;
  helpIndex:        number;
  activeDomains:    DomainDefinition[];

  // Project metadata
  projectName:      string;

  // Streaming / UI state
  isThinking:       boolean;
  isStreaming:      boolean;
  streamingText:    string;
  isComplete:       boolean;
  lastError:        LastError | null;
  lastUserMessage:  string;

  // Provider state
  currentProvider:  AIProvider | null;
  abortController:  AbortController | null;

  // Actions
  setProjectName:    (name: string) => void;
  setLockedContext:  (ctx: ProjectContext) => void;
  setProvider:       (p: AIProvider) => void;
  lockDomainChoice:  (domain: DomainId, key: string, value: string) => void;
  sendMessage:       (text: string) => void;
  confirmSchema:     () => void;
  addSchemaField:    (table: string, field: string, type: string, note: string) => void;
  setDomainContent:  (domainId: DomainId, content: string) => void;
  regenerateDomain:  (domainId: DomainId) => void;
  cancelStream:      () => void;
  clearError:        () => void;
  resumeFromSaved:   (data: {
    lockedContext:       ProjectContext;
    lockedChoices:       Partial<Record<DomainId, Record<string, string>>>;
    completedDomains:    DomainId[];
    domainContent:       Partial<Record<DomainId, string>>;
    conversationHistory: ChatMessage[];
    elaboration:         string;
  }) => void;
  reset: () => void;
}

function initialPhases(): Record<DomainId, DomainPhase> {
  return Object.fromEntries(DOMAINS.map(d => [d.id, "not_started"])) as Record<DomainId, DomainPhase>;
}

// Integration point — replace with PATCH /api/projects/[id] (see prompt 3)
function persistToSupabase(_: Partial<InterviewState>) {}

// ── Internal types ────────────────────────────────────────────────────────────
type S = InterviewState;
type SetFn = (p: Partial<S> | ((s: S) => Partial<S>)) => void;
type GetFn = () => S;

// ── Core reply function ───────────────────────────────────────────────────────
// This is the only place in the store that calls the AI.
// For openers and help responses we pass the opener text directly as userMessage;
// for real user input we pass their actual message.
function runReply(
  set: SetFn,
  get: GetFn,
  userMessage:  string,
  msgOpts:      Partial<ChatMessage>,
  onDone?:      () => void,
  // When true, the userMessage is an internal opener, not a real user turn —
  // it goes into the system prompt context but not into the messages array.
  isInternalOpener = false
) {
  const config = getActiveConfig();

  // No API key — show a friendly inline message and stop
  if (!config) {
    const noKeyMsg = "No API key configured. Go to **Settings → API Key** to add your Anthropic or OpenAI key.";
    set(s => ({ messages: [...s.messages, { role: "assistant" as const, content: noKeyMsg, ...msgOpts }] }));
    return;
  }

  // Update current provider in state
  set({ currentProvider: config.provider, isThinking: true, lastError: null });

  // Build context-aware system prompt from current store state
  const state = get();
  const systemPrompt = buildSystemPrompt(
    state.lockedContext!,
    state.currentDomain,
    state.elaboration,
    state.lockedChoices
  );

  const controller = new AbortController();
  set({ abortController: controller });

  // 30-second timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
    const errMsg = ERROR_MESSAGES.timeout;
    set(s => ({
      isThinking: false, isStreaming: false, streamingText: "",
      abortController: null,
      lastError: { type: "timeout", message: errMsg, lastUserMessage: userMessage },
      messages: [...s.messages, { role: "assistant" as const, content: errMsg }],
    }));
  }, 30_000);

  // Short thinking delay for UX (gives the dots animation time to appear)
  setTimeout(() => {
    set({ isThinking: false, isStreaming: true, streamingText: "" });

    streamAIResponse(
      systemPrompt,
      userMessage,
      { ...config, domainId: state.currentDomain },
      {
        onToken: (acc) => set({ streamingText: acc }),

        onDone: (full) => {
          clearTimeout(timeoutId);
          set(s => ({
            isStreaming:     false,
            streamingText:   "",
            abortController: null,
            messages:        [...s.messages, { role: "assistant" as const, content: full, ...msgOpts }],
          }));
          onDone?.();
        },

        onError: (type, message) => {
          clearTimeout(timeoutId);
          set(s => ({
            isStreaming:     false,
            streamingText:   "",
            isThinking:      false,
            abortController: null,
            lastError:       { type, message, lastUserMessage: userMessage },
            messages:        [...s.messages, { role: "assistant" as const, content: message }],
          }));
        },
      },
      controller.signal
    );
  }, 400);
}

function runOpener(set: SetFn, get: GetFn, domainId: DomainId) {
  const d     = DOMAINS.find(x => x.id === domainId)!;
  const opener = getOpener(domainId, get().lockedContext!, get().elaboration);
  const opts: Partial<ChatMessage> =
    d.mode === "cards"  ? { showCards: domainId } :
    d.mode === "schema" ? { showSchema: true }     : {};
  runReply(set, get, opener, opts, undefined, true);
}

function completeDomain(set: SetFn, get: GetFn, domainId: DomainId) {
  const content = generateDoc(domainId, get().lockedContext!, get().lockedChoices, get().elaboration);
  set(s => ({
    domainContent:    { ...s.domainContent, [domainId]: content },
    completedDomains: s.completedDomains.includes(domainId)
      ? s.completedDomains
      : [...s.completedDomains, domainId],
    domainPhases:     { ...s.domainPhases, [domainId]: "complete" },
  }));
  persistToSupabase({ domainContent: get().domainContent });

  const active = get().activeDomains;
  const next = nextDomainId(domainId, active);
  if (!next) {
    set({ isComplete: true });
    runReply(
      set, get,
      "Generate the final completion message for the interview.",
      { isComplete: true, showDownload: true },
      undefined,
      true
    );
    return;
  }
  set({ currentDomain: next });
  runOpener(set, get, next);
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useInterviewStore = create<InterviewState>((set, get) => ({
  lockedContext:    null,
  lockedChoices:    {},
  domainPhases:     initialPhases(),
  currentDomain:    DOMAINS[0].id,
  completedDomains: [],
  domainContent:    {},
  messages:         [],
  elaboration:      "",
  schemaTables:     DEFAULT_SCHEMA,
  schemaConfirmed:  false,
  helpIndex:        0,
  activeDomains:    DOMAINS,
  projectName:      "",
  isThinking:       false,
  isStreaming:      false,
  streamingText:    "",
  isComplete:       false,
  lastError:        null,
  lastUserMessage:  "",
  currentProvider:  null,
  abortController:  null,

  setProjectName: (name) => set({ projectName: name }),
  setProvider: (p) => set({ currentProvider: p }),

  setLockedContext: (ctx) => {
    const active = getActiveDomains(ctx.projectType);
    set(s => ({
      lockedContext: ctx,
      activeDomains: active,
      currentDomain: active[0].id,
      domainPhases: { ...s.domainPhases, [active[0].id]: "interviewing" },
    }));
    runOpener(set, get, active[0].id);
  },

  lockDomainChoice: (domain, key, value) => {
    set(s => ({
      lockedChoices: { ...s.lockedChoices, [domain]: { ...(s.lockedChoices[domain] ?? {}), [key]: value } },
    }));
    const label = CARD_CHOICES[domain]?.find(o => o.id === value)?.label ?? value;
    const domainLabel = DOMAINS.find(d => d.id === domain)!.label;
    // Push user "message" (the card selection) then immediately trigger doc gen
    set(s => ({ messages: [...s.messages, { role: "user" as const, content: `Selected: ${label}` }] }));
    runReply(
      set, get,
      `The user selected "${label}" for ${domainLabel}. Acknowledge the choice briefly (one sentence) and generate the ${domainLabel} documentation section.`,
      {},
      () => completeDomain(set, get, domain),
      true
    );
  },

  sendMessage: (text) => {
    if (!text.trim() || get().isThinking || get().isStreaming) return;
    const domain = get().currentDomain;
    const d      = DOMAINS.find(x => x.id === domain)!;
    const low    = text.toLowerCase();

    set(s => ({ messages: [...s.messages, { role: "user" as const, content: text }], lastUserMessage: text }));

    // Post-completion clarification
    if (get().isComplete) {
      runReply(set, get, text, {});
      return;
    }

    if (d.mode === "open") {
      if (domain === "planning") {
        set({ elaboration: text });
        runReply(
          set, get,
          `The user described their project: "${text}". Briefly acknowledge this (1-2 sentences), then generate the Planning & Scope documentation section.`,
          {},
          () => completeDomain(set, get, "planning"),
          true
        );
      } else {
        runReply(set, get, text, {}, () => completeDomain(set, get, domain));
      }

    } else if (d.mode === "schema") {
      if (/help|what|explain|mean|\?/.test(low)) {
        // Schema help — keep schema visible, don't advance
        const r = HELP_RESPONSES[get().helpIndex % HELP_RESPONSES.length];
        set(s => ({ helpIndex: s.helpIndex + 1 }));
        // For schema help we still use real AI but seed the conversation with the help request
        runReply(set, get, text, { showSchema: true });
      } else if (get().schemaConfirmed) {
        runReply(set, get, text, {});
      } else if (/good|ok|fine|done|confirm|lock|yes/.test(low)) {
        get().confirmSchema();
      } else {
        runReply(set, get, text, { showSchema: true });
      }

    } else {
      // "cards" mode — user typed instead of clicking a card
      runReply(set, get, text, { showCards: domain });
    }
  },

  confirmSchema: () => {
    if (get().schemaConfirmed) return;
    set({ schemaConfirmed: true });
    runReply(
      set, get,
      "The user confirmed the database schema. Acknowledge it (one sentence) and generate the Database Design documentation section.",
      {},
      () => completeDomain(set, get, "database"),
      true
    );
  },

  addSchemaField: (table, field, type, note) => {
    set(s => ({
      schemaTables: {
        ...s.schemaTables,
        [table]: [...(s.schemaTables[table] ?? []), { field, type, note }],
      },
    }));
    runReply(
      set, get,
      `The user added a field named "${field}" (type: ${type}) to the ${table} table. Acknowledge it briefly and ask if they want to add anything else before confirming the schema.`,
      { showSchema: true },
      undefined,
      true
    );
  },

  setDomainContent: (domainId, content) => {
    set(s => ({ domainContent: { ...s.domainContent, [domainId]: content } }));
    persistToSupabase({ domainContent: get().domainContent });
  },

  regenerateDomain: (domainId) => {
    const state = get();
    if (!state.lockedContext) return;
    const content = generateDoc(domainId, state.lockedContext, state.lockedChoices, state.elaboration);
    set(s => ({ domainContent: { ...s.domainContent, [domainId]: content } }));
    persistToSupabase({ domainContent: get().domainContent });
  },

  cancelStream: () => {
    get().abortController?.abort();
    set({ abortController: null, isThinking: false, isStreaming: false, streamingText: "" });
  },

  clearError: () => set({ lastError: null }),

  resumeFromSaved: (data) => {
    const active = getActiveDomains(data.lockedContext.projectType);
    const activeCompleted = data.completedDomains.filter(id => active.some(d => d.id === id));
    const nextIdx = active.findIndex(d => !activeCompleted.includes(d.id));
    set({
      lockedContext:    data.lockedContext,
      lockedChoices:    data.lockedChoices,
      completedDomains: data.completedDomains,
      domainContent:    data.domainContent,
      messages:         data.conversationHistory,
      elaboration:      data.elaboration,
      activeDomains:    active,
      currentDomain:    nextIdx === -1 ? active[active.length - 1].id : active[nextIdx].id,
      isComplete:       nextIdx === -1,
      domainPhases: Object.fromEntries(
        DOMAINS.map(d => [
          d.id,
          data.completedDomains.includes(d.id) ? "complete"
          : active[nextIdx]?.id === d.id ? "interviewing"
          : "not_started",
        ])
      ) as Record<DomainId, DomainPhase>,
    });
  },

  reset: () => {
    get().abortController?.abort();
    set({
      lockedContext: null, lockedChoices: {}, domainPhases: initialPhases(),
      currentDomain: DOMAINS[0].id, completedDomains: [], domainContent: {},
      messages: [], elaboration: "", schemaTables: DEFAULT_SCHEMA,
      schemaConfirmed: false, helpIndex: 0, activeDomains: DOMAINS, projectName: "",
      isThinking: false, isStreaming: false, streamingText: "", isComplete: false,
      lastError: null, lastUserMessage: "", currentProvider: null, abortController: null,
    });
  },
}));

export function selectFullDocument(state: InterviewState): string {
  if (!state.lockedContext) return "";
  return buildFullDocument(state.lockedContext, state.domainContent);
}
