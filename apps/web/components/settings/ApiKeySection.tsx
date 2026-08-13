// components/settings/ApiKeySection.tsx
// Two-provider BYOK UI: Anthropic + OpenAI.
// Each provider has its own key slot, verification flow, and connected state.
// A separate "Active provider" selector controls which one powers the interview.
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { PageHeader, Card, Field } from "@/components/settings/AccountSection";
import {
  type AIProvider,
  PROVIDER_MODELS,
  ACTIVE_PROVIDER_KEY,
} from "@/lib/ai/provider";
import { fetchKeys, saveKey, deleteKey } from "@/lib/ai/keys";
import { useToast } from "@/lib/toast";

interface Props {
  onConnectedChange: (provider: AIProvider, connected: boolean) => void;
}

interface ProviderState {
  connected:    boolean;
  maskedKey:    string;
  lastVerified: string;
  showInput:    boolean;
  showRemove:   boolean;
  keyInput:     string;
  verifying:    boolean;
  verifyError:  string | null;
}

function defaultProviderState(): ProviderState {
  return { connected: false, maskedKey: "", lastVerified: "", showInput: false, showRemove: false, keyInput: "", verifying: false, verifyError: null };
}

export function ApiKeySection({ onConnectedChange }: Props) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [activeTab,     setActiveTab]     = useState<"anthropic" | "openai" | "metamuse">("anthropic");
  const [activeProvider, setActiveProvider] = useState<AIProvider>("anthropic");
  const [states, setStates] = useState<Record<"anthropic" | "openai" | "metamuse", ProviderState>>({
    anthropic: defaultProviderState(),
    openai:    defaultProviderState(),
    metamuse:  defaultProviderState(),
  });
  const [bedrockStatus, setBedrockStatus] = useState<{
    configured: boolean; region: string | null; model: string | null;
  } | null>(null);

  // Load stored key metadata (masked, never raw) from the API on mount.
  // The active-provider *preference* is a non-secret UI setting kept locally.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await fetchKeys(getToken);
        if (cancelled) return;
        const saved: Record<"anthropic" | "openai" | "metamuse", ProviderState> = {
          anthropic: defaultProviderState(),
          openai:    defaultProviderState(),
          metamuse:  defaultProviderState(),
        };
        stored.forEach(k => {
          if (k.provider === "anthropic" || k.provider === "openai" || k.provider === "metamuse") {
            saved[k.provider] = {
              ...saved[k.provider],
              connected: true,
              maskedKey: k.maskedKey,
              lastVerified: "previously",
            };
          }
        });
        setStates(saved);
      } catch {
        if (!cancelled) toast("Could not load saved API keys");
      }
    })();
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    fetch(`${apiBase}/ai/bedrock-status`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setBedrockStatus(data); })
      .catch(() => { if (!cancelled) setBedrockStatus({ configured: false, region: null, model: null }); });
    const active = (localStorage.getItem(ACTIVE_PROVIDER_KEY) ?? "anthropic") as AIProvider;
    setActiveProvider(active);
    return () => { cancelled = true; };
  }, [getToken, toast]);

  type KeyProvider = "anthropic" | "openai" | "metamuse";

  function update(provider: KeyProvider, patch: Partial<ProviderState>) {
    setStates(prev => ({ ...prev, [provider]: { ...prev[provider], ...patch } }));
  }

  async function handleVerify(provider: KeyProvider) {
    const key = states[provider].keyInput.trim();
    if (!key) { toast("Enter your API key first"); return; }
    update(provider, { verifying: true, verifyError: null });

    // The server verifies the key against the provider, then encrypts and
    // stores it. The raw key never touches browser storage.
    const { maskedKey, error } = await saveKey(getToken, provider, key);

    if (error || !maskedKey) {
      update(provider, { verifying: false, verifyError: error ?? "Failed to save API key." });
      return;
    }

    // If this is the first connected provider, make it active.
    if (!localStorage.getItem(ACTIVE_PROVIDER_KEY)) {
      localStorage.setItem(ACTIVE_PROVIDER_KEY, provider);
      setActiveProvider(provider);
    }
    update(provider, {
      verifying: false, verifyError: null, connected: true,
      maskedKey, lastVerified: "just now",
      showInput: false, keyInput: "",
    });
    onConnectedChange(provider, true);
    const labels: Record<KeyProvider, string> = { anthropic: "Anthropic", openai: "OpenAI", metamuse: "Meta Muse" };
    toast(`${labels[provider]} API key verified and saved`);
  }

  async function handleRemove(provider: KeyProvider) {
    const ok = await deleteKey(getToken, provider);
    if (!ok) { toast("Failed to remove API key"); return; }

    if (activeProvider === provider) {
      const others: KeyProvider[] = provider === "anthropic" ? ["openai", "metamuse"] : provider === "openai" ? ["anthropic", "metamuse"] : ["anthropic", "openai"];
      const connected = others.find(p => states[p].connected);
      if (connected) {
        localStorage.setItem(ACTIVE_PROVIDER_KEY, connected);
        setActiveProvider(connected);
      } else {
        localStorage.removeItem(ACTIVE_PROVIDER_KEY);
      }
    }
    update(provider, { connected: false, maskedKey: "", lastVerified: "", showRemove: false });
    onConnectedChange(provider, false);
    const labels: Record<KeyProvider, string> = { anthropic: "Anthropic", openai: "OpenAI", metamuse: "Meta Muse" };
    toast(`${labels[provider]} API key removed`);
  }

  function handleSetActiveProvider(provider: AIProvider) {
    if (provider === "bedrock") {
      if (!bedrockStatus?.configured) return;
    } else if (!states[provider].connected) {
      return;
    }
    localStorage.setItem(ACTIVE_PROVIDER_KEY, provider);
    setActiveProvider(provider);
    const labels: Record<AIProvider, string> = { anthropic: "Anthropic Claude", openai: "OpenAI GPT-4o", bedrock: "Amazon Bedrock", metamuse: "Meta Muse" };
    toast(`Switched to ${labels[provider]}`);
  }

  const s = states[activeTab];
  const providerLabel = activeTab === "anthropic" ? "Anthropic" : activeTab === "openai" ? "OpenAI" : "Meta Muse";

  return (
    <div className="max-w-[640px]">
      <PageHeader title="API Key" sub="DevDocs AI uses your own API key — Bring Your Own Key (BYOK)." />

      {/* BYOK callout */}
      <div className="flex gap-2.5 p-3.5 rounded-lg border border-hairline bg-sidebar-mist mb-4">
        <span className="text-sm flex-shrink-0 mt-0.5">🔒</span>
        <div className="text-[12.5px] leading-snug text-ink-secondary">
          <strong className="font-medium">Your API keys are encrypted and stored securely.</strong> Keys are
          sent once over HTTPS to the DevDocs AI server, verified, and encrypted at rest with AES-256-GCM.
          They&apos;re never returned to the browser after saving, and all AI calls are made server-side —
          your key is never exposed to client code.
        </div>
      </div>

      {/* Provider tabs */}
      <Card title="API Keys" sub="Add keys for your preferred providers. You can switch between them at any time.">
        <div className="flex gap-1.5 mb-4">
          {(["anthropic", "openai", "metamuse"] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setActiveTab(p)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors border ${
                activeTab === p ? "bg-ink text-vellum border-ink" : "bg-white text-ink-muted border-vellum-border hover:text-ink"
              }`}
            >
              {p === "anthropic" ? "Anthropic" : p === "openai" ? "OpenAI" : "Meta Muse"}
              {states[p].connected && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-ink" />
              )}
            </button>
          ))}
        </div>

        {/* Connected state */}
        {s.connected && !s.showInput ? (
          <>
            <div className="flex items-center justify-between p-3.5 bg-vellum border border-vellum-border rounded-lg">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0 bg-ink" />
                <div>
                  <div className="font-mono text-[12.5px] text-ink">{s.maskedKey}</div>
                  <div className="text-[11px] text-ink-faint mt-0.5">
                    Connected · last verified {s.lastVerified}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3.5">
              <button
                type="button"
                onClick={() => update(activeTab, { showInput: true })}
                className="px-4 py-1.5 border border-vellum-border rounded-lg text-xs bg-white text-ink-secondary hover:border-ink"
              >
                Update key
              </button>
              <button
                type="button"
                onClick={() => update(activeTab, { showRemove: true })}
                className="px-4 py-1.5 border border-hairline rounded-lg text-xs text-ink-secondary hover:bg-hover-veil"
              >
                Remove key
              </button>
            </div>

            {s.showRemove && (
              <div className="flex gap-2.5 p-3.5 rounded-lg border border-hairline bg-sidebar-mist mt-3.5">
                <span className="text-sm">⚠</span>
                <div className="text-[12.5px] text-ink-secondary">
                  Remove your {providerLabel} key? You won&apos;t be able to use it for
                  interviews until you add it again.
                  <div className="flex gap-2 mt-2.5">
                    <button
                      type="button"
                      onClick={() => handleRemove(activeTab)}
                      className="px-3.5 py-1.5 rounded-lg text-xs text-white bg-ink"
                    >
                      Remove key
                    </button>
                    <button
                      type="button"
                      onClick={() => update(activeTab, { showRemove: false })}
                      className="px-3.5 py-1.5 border border-vellum-border rounded-lg text-xs bg-white text-ink-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Disconnected / input state */
          <>
            <Field label={`${providerLabel} API key`}>
              <input
                type="text"
                value={s.keyInput}
                onChange={e => update(activeTab, { keyInput: e.target.value, verifyError: null })}
                onKeyDown={e => e.key === "Enter" && handleVerify(activeTab)}
                placeholder={activeTab === "anthropic" ? "sk-ant-api03-..." : activeTab === "openai" ? "sk-..." : "LLM_..."}
                className="w-full px-3 py-2.5 border border-ink/15 rounded-lg text-[13px] bg-white text-ink font-mono focus:outline-none focus:border-ink/30"
              />
              {s.verifyError && (
                <div className="text-[11px] mt-1.5 text-ink-muted">{s.verifyError}</div>
              )}
              <div className="text-[11px] text-ink-faint mt-1.5">
                {activeTab === "anthropic" ? (
                  <>Get your key at{" "}
                    <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-ink underline">console.anthropic.com</a>
                  </>
                ) : activeTab === "openai" ? (
                  <>Get your key at{" "}
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-ink underline">platform.openai.com</a>
                  </>
                ) : (
                  <>Get your key at{" "}
                    <a href="https://meta.ai/api" target="_blank" rel="noreferrer" className="text-ink underline">meta.ai/api</a>
                  </>
                )}
              </div>
            </Field>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleVerify(activeTab)}
                disabled={s.verifying || !s.keyInput.trim()}
                className="px-4 py-1.5 bg-ink text-vellum rounded-lg text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {s.verifying ? "Verifying..." : "Verify & save"}
              </button>
              {s.connected && (
                <button
                  type="button"
                  onClick={() => update(activeTab, { showInput: false, keyInput: "", verifyError: null })}
                  className="px-4 py-1.5 border border-vellum-border rounded-lg text-xs bg-white text-ink-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Active provider selector */}
      <Card title="Active provider" sub="Which AI powers your planning interview.">
        <div className="flex flex-col gap-2">
          {(["anthropic", "openai", "metamuse"] as ("anthropic" | "openai" | "metamuse")[]).map(p => {
            const connected = states[p].connected;
            const isActive  = activeProvider === p;
            return (
              <button
                key={p}
                type="button"
                disabled={!connected}
                onClick={() => handleSetActiveProvider(p)}
                className={`flex items-center justify-between p-3.5 rounded-lg border text-left transition-colors ${
                  isActive && connected
                    ? "border-ink bg-white"
                    : connected
                    ? "border-vellum-border bg-vellum hover:border-ink/30"
                    : "border-vellum-border-light bg-vellum opacity-50 cursor-not-allowed"
                }`}
              >
                <div>
                  <div className="text-[13px] font-medium text-ink">
                    {p === "anthropic" ? "Anthropic Claude" : p === "openai" ? "OpenAI" : "Meta Muse"}
                  </div>
                  <div className="text-[11px] text-ink-faint mt-0.5">
                    {`${PROVIDER_MODELS[p].label} · ${PROVIDER_MODELS[p].default}`}
                  </div>
                  {!connected && (
                    <div className="text-[11px] mt-0.5 text-ink-faint">
                      Add a key above to enable
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  {isActive && connected && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium badge-green">Active</span>
                  )}
                  {!connected && (
                    <span className="text-[10px] px-2 py-0.5 rounded-none font-medium bg-sidebar-mist text-ink-muted">No key</span>
                  )}
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isActive && connected ? "border-ink" : "border-vellum-border"
                  }`}>
                    {isActive && connected && <div className="w-2 h-2 rounded-full bg-ink" />}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Bedrock option */}
          <button
            type="button"
            disabled={!bedrockStatus?.configured}
            onClick={() => bedrockStatus?.configured && handleSetActiveProvider("bedrock")}
            className={`flex items-center justify-between p-3.5 rounded-lg border text-left transition-colors ${
              activeProvider === "bedrock" && bedrockStatus?.configured
                ? "border-ink bg-white"
                : bedrockStatus?.configured
                ? "border-vellum-border bg-vellum hover:border-ink/30"
                : "border-vellum-border-light bg-vellum opacity-50 cursor-not-allowed"
            }`}
          >
            <div>
              <div className="text-[13px] font-medium text-ink">Amazon Bedrock</div>
              <div className="text-[11px] text-ink-faint mt-0.5">
                {bedrockStatus?.configured
                  ? `${bedrockStatus.region} · ${bedrockStatus.model?.split(".").pop()?.replace(/-v\d+:\d+$/, "") ?? "Claude"}`
                  : "Not configured on this server"}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              {bedrockStatus?.configured ? (
                <>
                  {activeProvider === "bedrock" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium badge-green">Active</span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium badge-amber">Server</span>
                </>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-none font-medium bg-sidebar-mist text-ink-muted">
                  Not configured
                </span>
              )}
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                activeProvider === "bedrock" && bedrockStatus?.configured ? "border-ink" : "border-vellum-border"
              }`}>
                {activeProvider === "bedrock" && bedrockStatus?.configured && <div className="w-2 h-2 rounded-full bg-ink" />}
              </div>
            </div>
          </button>
        </div>

        <div className="text-[11px] text-ink-faint mt-3">
          DevDocs AI doesn&apos;t track your API usage or costs. Monitor usage in the{" "}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-ink underline">Anthropic Console</a>
          {", "}
          <a href="https://platform.openai.com/usage" target="_blank" rel="noreferrer" className="text-ink underline">OpenAI dashboard</a>
          {", or "}
          <a href="https://meta.ai/api" target="_blank" rel="noreferrer" className="text-ink underline">Meta Muse portal</a>
          .
        </div>
      </Card>

      {/* Bedrock info card */}
      <Card title="Amazon Bedrock" sub="Use Claude via AWS infrastructure — server-configured only.">
        {bedrockStatus?.configured ? (
          <div className="flex gap-2.5 p-3.5 rounded-lg border border-hairline bg-sidebar-mist">
            <span className="text-sm flex-shrink-0">✓</span>
            <div className="text-[12.5px] leading-snug text-ink-secondary">
              <strong className="font-medium">Bedrock is configured.</strong> Using region{" "}
              <code className="font-mono text-[11px]">{bedrockStatus.region}</code> with model{" "}
              <code className="font-mono text-[11px]">{bedrockStatus.model}</code>.
              <br/>To change the model, update <code className="font-mono text-[11px]">AWS_BEDROCK_MODEL</code>{" "}
              in your server environment.
            </div>
          </div>
        ) : (
          <div className="flex gap-2.5 p-3.5 rounded-lg border border-hairline bg-sidebar-mist">
            <span className="text-sm flex-shrink-0 text-ink-faint">○</span>
            <div className="text-[12.5px] leading-snug text-ink-muted">
              Bedrock is not configured on this server. Add{" "}
              <code className="font-mono text-[11px]">AWS_ACCESS_KEY_ID</code>,{" "}
              <code className="font-mono text-[11px]">AWS_SECRET_ACCESS_KEY</code>, and{" "}
              <code className="font-mono text-[11px]">AWS_REGION</code> to your API environment,
              then enable model access in the{" "}
              <a href="https://console.aws.amazon.com/bedrock" target="_blank" rel="noreferrer" className="text-ink underline">
                AWS Bedrock console
              </a>.
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
