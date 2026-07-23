# DevDocs AI — Claude Code Prompts
# One prompt per improvement. Paste each into Claude Code when ready to tackle that task.
# Order matches priority: do these top-to-bottom.

---

## 1. WIRE THE REAL ANTHROPIC AI (unlocks everything)

You are working on DevDocs AI — a Next.js 14 App Router project that interviews
developers before they start coding and generates a 10-file documentation bundle.
The stack is Next.js 14, TypeScript, Zustand, Supabase, Tailwind CSS, and the
Anthropic SDK.

The Anthropic API key is stored in the user's browser localStorage under the key
`devdocs_api_key`. It was validated in components/settings/ApiKeySection.tsx before
being saved. All AI calls must be made client-side directly from the browser to
Anthropic — the key must never be sent to a DevDocs AI server.

Task: Replace the mock `streamAIResponse()` function in `lib/interview/store.ts`
with a real Anthropic SDK streaming call.

Requirements:
1. Install `@anthropic-ai/sdk` and configure it with `dangerouslyAllowBrowser: true`.
2. Read the API key from `localStorage.getItem("devdocs_api_key")` before each call.
   If the key is missing, push a `ChatMessage` with role "assistant" and content
   "No API key found. Please add your Anthropic API key in Settings." then return.
3. The streaming call should use `claude-sonnet-4-6` and `max_tokens: 2000`.
4. Build the system prompt using `lockedContext` and `elaboration` from the store
   state, so the AI knows the project type, team size, timeline, budget, experience
   level, and the user's free-text project description from the planning domain.
   The system prompt should instruct the AI to behave as a senior developer
   interviewing the user, and for document generation domains, to output clean
   markdown with `## Heading` and `**bold labels**` matching the format already
   used in `lib/interview/domains.ts` `generateDoc()`.
5. Stream each text delta into the existing `onToken(acc)` callback pattern —
   accumulate the full response and call `onDone(full)` when the stream ends.
6. Handle errors: on any Anthropic API error, set `store.lastError` to a
   human-readable string and push an assistant message explaining what went wrong
   (rate limit, invalid key, etc.).
7. The existing `getOpener()` and `generateDoc()` functions in `lib/interview/domains.ts`
   contain the mock text. Keep them as fallback/reference but the real AI response
   should replace their output in all chat bubbles.

Do not change the public API of `useInterviewStore` — only replace the internals
of `streamAIResponse()`. The store's `runReply()` and `runOpener()` helpers call
`streamAIResponse()` and should continue to work unchanged.

---

## 2. AUTH FLOW — SIGNUP, SESSION, PROTECTED ROUTES

You are working on DevDocs AI — a Next.js 14 App Router project.
Supabase is the auth provider. The login page exists at `app/(auth)/login/page.tsx`
but currently submits to a `console.log`. There is no signup page, no password
reset, and no route protection.

Task: Implement the complete auth flow.

Requirements:
1. Create `lib/supabase/client.ts` — a browser Supabase client using
   `createBrowserClient` from `@supabase/ssr`. Read `NEXT_PUBLIC_SUPABASE_URL`
   and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from environment variables.

2. Create `lib/supabase/server.ts` — a server Supabase client using
   `createServerClient` from `@supabase/ssr` for use in Server Components
   and middleware.

3. Update `app/(auth)/login/page.tsx`:
   - Wire the form `handleSubmit` to `supabase.auth.signInWithPassword({ email, password })`.
   - Wire the Google OAuth button to `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: "/auth/callback" } })`.
   - Wire the GitHub OAuth button to `supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: "/auth/callback" } })`.
   - On success, redirect to `/dashboard` using `router.push`.
   - On error, show the error message inline below the submit button — styled
     in the same cream/terracotta palette (border-left terracotta callout, same
     pattern as the BYOK callout in ApiKeySection.tsx).

4. Create `app/(auth)/signup/page.tsx` — same visual design as login.tsx.
   Fields: email, password, confirm password. Wire to
   `supabase.auth.signUp({ email, password })`. On success, show a "Check your
   email to confirm your account" confirmation message in place of the form.

5. Create `app/(auth)/forgot-password/page.tsx` — email field only. Wire to
   `supabase.auth.resetPasswordForEmail(email, { redirectTo: "/auth/reset-password" })`.

6. Create `app/auth/callback/route.ts` — exchange the `code` query param for a
   session using `supabase.auth.exchangeCodeForSession(code)`, then redirect to
   `/dashboard`.

7. Create `middleware.ts` at the project root:
   - Protect all routes under `/(app)/` — if no session, redirect to `/login`.
   - Let `/`, `/login`, `/signup`, `/forgot-password`, and `/auth/callback` pass
     through unauthenticated.
   - Use `updateSession` from `@supabase/ssr` to keep the session cookie fresh.

8. Update the "Sign out" button in `components/layout/Navbar.tsx` to call
   `supabase.auth.signOut()` then `router.push("/login")`.

9. Update the "Sign out" button in the avatar dropdown (same Navbar.tsx) to do
   the same.

Keep all visual styles unchanged — this is purely a wiring task.

---

## 3. PERSIST INTERVIEW STATE TO SUPABASE

You are working on DevDocs AI — a Next.js 14 App Router project.
The Zustand interview store (`lib/interview/store.ts`) has a no-op
`persistToSupabase()` function. The store has `resumeFromSaved()` that can
hydrate saved state, but it is never called. Users lose their interview progress
on page refresh.

The Supabase schema has a `projects` table with columns including
`interview_data JSONB` (per data-model.md). The browser Supabase client is at
`lib/supabase/client.ts`.

Task: Wire persistence so interview progress survives page refresh.

Requirements:
1. Replace the no-op `persistToSupabase(partial)` in `lib/interview/store.ts`
   with a real debounced PATCH call:
   - Use `supabase.from("projects").update({ interview_data: <shape> }).eq("id", projectId).eq("user_id", userId)`.
   - The `interview_data` shape to persist: `{ lockedContext, lockedChoices, completedDomains, domainContent, conversationHistory: messages, elaboration }`.
   - Debounce the call 1500ms so rapid successive token updates don't flood Supabase.
   - The store needs to know the current `projectId` — add it as a top-level
     state field set by a new `setProjectId(id: string)` action.
   - Log but do not throw on persistence errors — interview flow must never
     break because of a database write failure.

2. Update `app/(app)/project/[id]/interview/page.tsx`:
   - Replace the MOCK_PROJECTS lookup with a real `supabase.from("projects").select("*").eq("id", params.id).single()` call.
   - Call `store.setProjectId(params.id)` before rendering.
   - If the returned row has `interview_data` with a non-null `lockedContext`,
     call `store.resumeFromSaved(interview_data)` instead of showing the
     DiscoveryForm — the user should land back in the interview exactly where
     they left off.
   - Show a loading skeleton (a simple centered spinner in the Vellum cream
     background) while the fetch is in flight.
   - Handle the case where the project doesn't exist or belongs to a different
     user — redirect to `/dashboard` with an error toast.

3. Update `app/(app)/dashboard/page.tsx`:
   - Replace the MOCK_PROJECTS array with a real Supabase query:
     `supabase.from("projects").select("*").eq("user_id", userId).is("deleted_at", null).order("updated_at", { ascending: false })`.
   - Map the DB row shape to the `Project` type in `lib/types.ts`.
   - Wire `handleDelete` to a soft delete:
     `supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", id)`.
   - Wire `handleCreate` to an INSERT:
     `supabase.from("projects").insert({ name, type, user_id: userId, status: "in_progress" }).select().single()`
     then redirect to the new project's interview page.

4. Update `lib/docs-library.ts`:
   - Replace `buildLibraryDocs()` mock with a real query that joins `projects`
     and `documentation_bundles` tables for the current user.
   - Keep the `LibraryDoc` interface unchanged — only the data source changes.

---

## 4. ERROR STATES AND TIMEOUT HANDLING

You are working on DevDocs AI — a Next.js 14 App Router project.
The interview store (`lib/interview/store.ts`) calls the Anthropic API via
`streamAIResponse()`. Currently there is no timeout, no error UI, and no
retry mechanism. If the API call fails or hangs, the thinking dots spin forever.

Task: Add comprehensive error handling to the interview flow.

Requirements:
1. In `lib/interview/store.ts`, wrap every `streamAIResponse()` call with a
   30-second timeout. If the timeout fires before `onDone` is called:
   - Cancel the in-flight request (use an AbortController).
   - Set `isThinking: false, isStreaming: false, streamingText: ""`.
   - Push an assistant message: "The request timed out. This can happen when
     the Anthropic API is under load. Try sending your message again."

2. Add a `lastError` field to the store (type `{ type: "timeout" | "auth" | "rate_limit" | "network" | "unknown"; message: string } | null`).
   Set it on any Anthropic API error and clear it when the next successful
   response arrives.

3. Create `components/interview/ErrorBanner.tsx`:
   - Renders below the context bar and above the message list when `store.lastError` is non-null.
   - Shows the error message with a terracotta left-border callout.
   - Shows a "Try again" button that clears the error and re-sends the last
     user message (store the last user message text as `store.lastUserMessage`).
   - Shows a "Check API key" link that opens `/settings?section=apikey` for
     auth errors.

4. In `components/interview/ChatPanel.tsx`, import and render `<ErrorBanner />`
   between the context bar and the messages list.

5. In `components/settings/ApiKeySection.tsx`, the `verifyKey()` function
   currently uses a `setTimeout` fake. Replace it with a real Anthropic API
   call (`/v1/messages` with a minimal prompt and `max_tokens: 1`) to validate
   the key. Handle 401 (invalid key), 429 (rate limited — key is valid, just
   busy), and network errors distinctly with different inline messages.

---

## 5. DOMAIN SKIPPING BY PROJECT TYPE

You are working on DevDocs AI — a Next.js 14 App Router project.
The interview always runs all 10 domains regardless of project type. A landing
page doesn't need a database schema. A CLI tool doesn't need auth or frontend.
The project type is available from `store.lockedContext.projectType`.

Task: Skip irrelevant domains per project type.

Requirements:
1. In `lib/interview/domains.ts`, add a `relevantFor` array to each
   `DomainDefinition` listing which `ProjectType` values apply. Use these rules:
   - `planning`, `architecture`, `deployment`: all project types.
   - `database`, `auth`: all except `landing_page`.
   - `api`: `saas`, `api`, `mobile`, `other`.
   - `environment`, `testing`, `monitoring`: all except `landing_page`.
   - `frontend`: `saas`, `mobile`, `landing_page`, `internal_tool`, `other`.

2. Add a `getActiveDomains(projectType: ProjectType): DomainDefinition[]` export
   that filters `DOMAINS` by `relevantFor`.

3. Update `lib/interview/store.ts`:
   - In `setLockedContext()`, compute `activeDomains = getActiveDomains(ctx.projectType)`.
   - Store `activeDomains` in the store state.
   - Use `activeDomains` everywhere `DOMAINS` is currently used for iteration
     (finding next domain, checking completion, etc.).

4. Update `components/interview/DomainProgress.tsx` to render only `activeDomains`
   from the store, not the full `DOMAINS` array. The progress percentage
   should be based on `completedDomains.length / activeDomains.length`.

5. Update `app/(app)/project/[id]/interview/page.tsx` to use `activeDomains.length`
   for the percentage displayed in the header badge.

6. In the completion logic in the store, the interview is "complete" when
   `completedDomains.length >= activeDomains.length`, not `>= DOMAINS.length`.

---

## 6. INLINE DOCUMENT EDITING AFTER COMPLETION

You are working on DevDocs AI — a Next.js 14 App Router project.
After the interview completes, `components/interview/PreviewPanel.tsx` slides in
and renders the merged DOCUMENTATION.md as read-only HTML. Users cannot edit
the output without rerunning the interview. This is the most-requested missing
feature after launch.

Task: Add an inline edit mode to the preview panel.

Requirements:
1. Update `components/interview/PreviewPanel.tsx`:
   - Add a toggle button ("Edit" / "Preview") in the panel header, to the left
     of the existing "Download" button.
   - In "Preview" mode (default): render the markdown as styled HTML (current behaviour).
   - In "Edit" mode: render a `<textarea>` containing the raw markdown text,
     styled to fill the panel body. Use the Vellum design tokens — `bg-vellum`,
     `border-vellum-border`, `text-ink`, `font-mono`, `text-xs`, `rounded-vellum`.
     The textarea should have no resize handle.

2. Add a `setDomainContent(domainId: DomainId, content: string)` action to the
   Zustand store in `lib/interview/store.ts` that updates a single domain's
   content and calls `persistToSupabase()`.

3. The textarea in edit mode should edit the full merged document
   (`selectFullDocument(store)`) as a single string, not per-domain.
   On any change, parse the edited string back into per-domain sections by
   splitting on `---` separators and update each domain's content via
   `setDomainContent`. Debounce the parse-and-save 800ms.

4. Add a "Regenerate this section" button per domain. When clicked:
   - Find the current domain id from the section heading in the document.
   - Call `store.regenerateDomain(domainId)` — a new store action that re-runs
     `generateDoc()` (or the real Anthropic call once wired) for that domain
     and calls `persistToSupabase()`.
   - Show a brief loading spinner in place of that section while regenerating.

5. The "Download" button should always download the current state of the
   document — including any manual edits made in edit mode.

---

## 7. ZIP EXPORT (10 SEPARATE FILES)

You are working on DevDocs AI — a Next.js 14 App Router project.
The landing page and pricing section both advertise "ZIP export" as a free-tier
feature. Currently only a single merged DOCUMENTATION.md download exists.
The 10 individual domain files (PLANNING.md, ARCHITECTURE.md, etc.) are never
exported separately.

Task: Implement ZIP export using JSZip.

Requirements:
1. Install `jszip` and `@types/jszip`.

2. Create `lib/export/buildZip.ts`:
   - Export `async function buildProjectZip(ctx: ProjectContext, domainContent: Partial<Record<DomainId, string>>): Promise<Blob>`.
   - Use JSZip to create a ZIP with a `docs/` folder.
   - Write each completed domain as a separate file: `docs/PLANNING.md`,
     `docs/ARCHITECTURE.md`, etc. Use the exact filenames from `DOMAINS[n].file`
     in `lib/interview/domains.ts`.
   - Add a `docs/README.md` at the root with this content:
     ```
     # Project Documentation
     Generated by DevDocs AI.

     ## How to use with AI coding agents
     Point your coding agent at this README. It will automatically read the
     docs/ folder as context before writing any code.

     ## Files
     - PLANNING.md — project scope and MVP definition
     - ARCHITECTURE.md — architecture decisions and patterns
     [... one line per domain file ...]
     ```
   - Return the zip as a `Blob`.

3. Update `components/interview/PreviewPanel.tsx`:
   - Change the existing "↓ Download" button to "↓ Download .md".
   - Add a second button "↓ Download .zip" that calls `buildProjectZip()`,
     creates an object URL, and triggers a download named
     `[project-name]-docs.zip`. The project name should come from a new
     `projectName` field in the store (set alongside `setProjectId`).
   - Show a brief loading state (spinner, button disabled) while the ZIP is
     being assembled — JSZip is async.

4. Update `components/interview/ChatPanel.tsx`:
   - The inline "Download DOCUMENTATION.md" button in the completion message
     (`message.showDownload === true`) should also offer a ZIP option.
   - Add a second small link "or download as .zip" below the existing button.

5. Update the dashboard `handleDownload` in `app/(app)/dashboard/page.tsx`:
   - Currently downloads a stub. Replace with `buildProjectZip()` using the
     project's real `domainContent` from Supabase.

---

## 8. ROUTE PROTECTION (MIDDLEWARE)

You are working on DevDocs AI — a Next.js 14 App Router project using Supabase
for auth. There is currently no middleware — all routes are publicly accessible.

Task: Add route protection so unauthenticated users are redirected to /login.

Requirements:
1. Create `middleware.ts` at the project root:
   - Use `createServerClient` from `@supabase/ssr` with the request/response
     cookie pattern Supabase requires for middleware.
   - Call `supabase.auth.getUser()` to check for a valid session.
   - If no session and the request path starts with `/dashboard`, `/project`,
     `/settings`, or `/docs`, redirect to `/login?redirected=true`.
   - If a session exists and the request path is `/login` or `/signup`,
     redirect to `/dashboard` (already logged in).
   - All other paths pass through unchanged (landing page, auth callbacks, etc).
   - Export a `config` matcher that excludes `_next/static`, `_next/image`,
     and `favicon.ico`.

2. Update `app/(auth)/login/page.tsx`:
   - Read the `redirected` search param. If present, show a subtle inline
     notice: "Sign in to continue." above the card — not a full error state,
     just a small informational line in `text-ink-muted`.

3. Update `app/(auth)/login/page.tsx` post-sign-in redirect:
   - After successful sign-in, check if there's a `next` query param
     (`/login?next=/project/abc123/interview`). If present, redirect there.
     Otherwise redirect to `/dashboard`.
   - This supports deep-link preservation across the auth redirect.

---

## 9. CMD+K SEARCH

You are working on DevDocs AI — a Next.js 14 App Router project.
The "⌘K — Search projects" button in `components/layout/Navbar.tsx` is
currently decorative (no `onClick` handler). The button is already correctly
positioned and styled.

Task: Wire the Cmd+K button to a functional project search modal.

Requirements:
1. Create `components/layout/SearchModal.tsx`:
   - A full-screen overlay (`fixed inset-0 bg-ink/40 z-50`) with a centered
     modal card (max-width 560px, same `bg-vellum-white border border-parchment
     rounded-vellum shadow-xl` style as CreateProjectModal).
   - A search input at the top, autofocused when the modal opens.
     Placeholder: "Search projects and documents..."
   - Below the input, two sections with `text-[10px] uppercase tracking-wider
     text-ink-faint` labels: "Projects" and "Documents".
   - Each result row: icon (project type badge or file type indicator) + name +
     right-side metadata (last modified or domain label). Clicking a result
     navigates to the relevant page and closes the modal.
   - Empty state: "No results for '...'" with a subtle `text-ink-faint` message.
   - Filter logic: fuzzy-match (simple `includes`) against project names,
     project types, document filenames, and domain labels.
   - Keyboard: `↑` / `↓` to move selection, `Enter` to navigate to the
     selected result, `Escape` to close.

2. Update `components/layout/Navbar.tsx`:
   - Add `useState` for `searchOpen`.
   - The "⌘K" button's `onClick` sets `searchOpen(true)`.
   - Add a `useEffect` that listens for `Cmd+K` / `Ctrl+K` globally
     (prevent default, open modal).
   - Render `<SearchModal open={searchOpen} onClose={()=>setSearchOpen(false)} projects={...} docs={...}/>`.
   - Pass `MOCK_PROJECTS` and `buildLibraryDocs()` as props for now — swap
     for real Supabase data once task 3 is complete.

3. The modal should close on outside click (clicking the overlay) and on
   `Escape`. Do not use any external dependency — implement focus management
   and keyboard handling directly.

---

## 10. REACT-MARKDOWN AND XSS SAFETY

You are working on DevDocs AI — a Next.js 14 App Router project.
Four components use `dangerouslySetInnerHTML` with a hand-rolled markdown
regex chain: `components/interview/PreviewPanel.tsx`,
`components/docs/DocList.tsx` (DocPreview function), and
`components/interview/ChatPanel.tsx` (the `mdLite` function for streaming
bubbles). This is a potential XSS surface since user-typed content (the
elaboration field, schema field names) reaches the preview renderer.

Task: Replace all custom markdown renderers with `react-markdown` and a
sanitised component map.

Requirements:
1. Install `react-markdown` and `rehype-sanitize`.

2. Create `components/ui/MarkdownRenderer.tsx`:
   - Export `function MarkdownRenderer({ content, size }: { content: string; size?: "sm" | "md" })`.
   - Use `<ReactMarkdown>` with `rehypePlugins={[rehypeSanitize]}`.
   - Pass a `components` prop that maps markdown elements to styled HTML:
     - `h2`: `font-serif-heading text-[15px] text-ink mb-2 mt-4 pb-1.5 border-b border-vellum-border-light`
     - `strong`: `font-medium text-ink`
     - `code` (inline): `font-mono text-[11px] bg-vellum border border-vellum-border px-1 py-0.5 rounded`
     - `p`: `mb-2 text-ink-secondary leading-relaxed`
   - The `size="sm"` variant uses slightly smaller text classes for the preview
     panel (current 12px), `size="md"` for the chat bubbles (current 14px).

3. Replace `dangerouslySetInnerHTML` in `components/interview/PreviewPanel.tsx`
   with `<MarkdownRenderer content={selectFullDocument(store)} size="sm"/>`.

4. Replace `dangerouslySetInnerHTML` in `DocPreview` inside
   `components/docs/DocList.tsx` with `<MarkdownRenderer content={doc.content} size="md"/>`.

5. The `mdLite` function in `components/interview/ChatPanel.tsx` is used for
   streaming bubbles — it must remain fast (no full markdown parse per token).
   Keep it for streaming only. Once streaming ends and the message is committed
   to `store.messages`, render that committed bubble with
   `<MarkdownRenderer content={message.content} size="md"/>` instead of `mdLite`.

6. Remove the four regex-based `mdToHtml` / `renderMarkdown` / `mdLite`
   function definitions that are no longer needed after this change.

---

## 11. GLOBAL TOAST PROVIDER

You are working on DevDocs AI — a Next.js 14 App Router project.
Toast notifications are currently re-implemented on every page as
`useState<string|null>` + `setTimeout` (in settings/page.tsx, dashboard/page.tsx,
and the interview page). Two toasts cannot coexist, and the implementation
is duplicated across three files.

Task: Replace all per-page toast state with a single global toast provider.

Requirements:
1. Create `lib/toast.tsx`:
   - A React context + provider with a queue (array of `{ id: string; message: string; type: "success" | "error" | "info" }`).
   - Export `useToast()` hook that returns `{ toast(message, type?) }`.
   - Toasts auto-dismiss after 2200ms. Multiple toasts stack vertically
     (max 3 visible at once — oldest dismisses first if a 4th arrives).

2. Create `components/ui/ToastStack.tsx`:
   - Renders the active toast queue at `fixed bottom-5 right-5 z-50 flex flex-col gap-2`.
   - Each toast: `bg-ink text-vellum text-xs px-4 py-2 rounded-lg` with an
     optional left-border colour: green for success, terracotta for error,
     no border for info.
   - Animate in with a subtle slide-up + fade (CSS `@keyframes`, no external
     animation library needed).
   - Each toast has an `×` dismiss button on the right.

3. Update the root layout (`app/layout.tsx`) to wrap children with
   `<ToastProvider>` and render `<ToastStack/>` inside it.

4. Remove the per-page `useState<string|null>` toast implementations and their
   corresponding conditional `<div>` renders from:
   - `app/(app)/settings/page.tsx`
   - `app/(app)/dashboard/page.tsx`
   - Any other pages that have the pattern.

5. Replace all `showToast(msg)` and `onToast(msg)` prop-drilling with direct
   `const { toast } = useToast()` calls at the component level. This removes
   the `onToast` prop from `AccountSection`, `ApiKeySection`, and `PrivacySection`
   entirely.

---

## 12. MOBILE RESPONSIVE LAYOUT

You are working on DevDocs AI — a Next.js 14 App Router project.
The interview page (`app/(app)/project/[id]/interview/page.tsx`) uses a fixed
three-panel flex layout that breaks below ~900px. At mobile widths, the chat
panel is unusable.

Task: Make the interview page usable on mobile by collapsing sidebars into
drawers below 900px.

Requirements:
1. Update `app/(app)/project/[id]/interview/page.tsx`:
   - Below `md` breakpoint (768px), hide `DomainProgress` and `PreviewPanel`
     from the flex row.
   - Add a bottom navigation bar (fixed, `h-14`, `border-t border-vellum-border
     bg-vellum`) with two icon buttons:
     - "Domains" (bullet list icon): opens the domain progress as a bottom sheet.
     - "Document" (file icon, only shown when `store.isComplete`): opens the
       preview panel as a bottom sheet.
   - On `md` and above: current three-panel layout unchanged.

2. Create `components/ui/BottomSheet.tsx`:
   - Props: `open: boolean, onClose: () => void, title: string, children: ReactNode`.
   - A slide-up panel from the bottom of the screen: `fixed bottom-0 left-0 right-0
     bg-vellum border-t border-vellum-border rounded-t-2xl z-40 max-h-[75vh]
     overflow-y-auto`.
   - A drag handle bar at the top centre.
   - Closes on backdrop click and `Escape`.
   - Animate with a CSS transform transition (translateY 100% → 0).

3. Render `<DomainProgress/>` inside a `<BottomSheet title="Interview Progress">` 
   triggered by the "Domains" bottom nav button.

4. Render `<PreviewPanel/>` inside a `<BottomSheet title="DOCUMENTATION.md">`
   triggered by the "Document" bottom nav button when `store.isComplete`.

5. Add a "best on desktop" banner for the landing page at mobile widths:
   - In `app/page.tsx`, add a `sm:hidden` div at the very top of the page
     (above the nav) with a terracotta background, white text:
     "DevDocs AI is best experienced on a larger screen."
   - This is not a blocker — just an honest heads-up.

---

## 13. TEMPLATES PAGE

You are working on DevDocs AI — a Next.js 14 App Router project.
The "Templates" nav link in `components/layout/Navbar.tsx` links to `/templates`
which returns a 404. The landing page references templates as a planned feature.

Task: Build the templates page with 6 pre-built planning starting points.

Requirements:
1. Create `lib/templates.ts`:
   - Define a `Template` type: `{ id, name, description, projectType, lockedContext: Partial<ProjectContext>, lockedChoices: Partial<Record<DomainId, Record<string, string>>>, elaboration: string }`.
   - Export 6 templates:
     - "Next.js SaaS Starter" — saas, solo, 3-6 months, self-funded, architecture: modular, auth: supabase, deployment: vercel
     - "REST API Service" — api, small, 1-3 months, bootstrapped, architecture: monolith, deployment: railway
     - "Internal Tool" — internal_tool, medium, under 1 month, bootstrapped, auth: nextauth, deployment: vercel
     - "Mobile App (React Native)" — mobile, small, 3-6 months, self-funded, auth: supabase, deployment: vercel
     - "Marketing Landing Page" — landing_page, solo, under 1 month, bootstrapped, deployment: vercel
     - "Team Dashboard SaaS" — saas, large, 6+ months, funded, architecture: modular, auth: auth0, monitoring: datadog, deployment: aws

2. Create `app/(app)/templates/page.tsx`:
   - Same Navbar + sidebar shell as the dashboard.
   - A grid of 6 template cards using the same `border border-vellum-border
     rounded-vellum bg-white` card style as project cards.
   - Each card shows: template name, project type badge, 2-line description,
     and a "Use this template →" button.
   - "Use this template →" opens a modal asking only for a project name
     (the type, context, and choices all come from the template).
   - On confirm: creates a new project with the template data pre-populated,
     calls `store.resumeFromSaved()` with the template's context and choices,
     then navigates to `/project/[id]/interview` — the interview starts at the
     first non-cards domain (planning) with the card choices already locked.

3. Add the sidebar to the templates page with "Back to projects" link and a
   note "Templates pre-fill your choices so the interview focuses on what
   matters for your project type."

---

## 14. LOADING SKELETON FOR THE INTERVIEW PAGE

You are working on DevDocs AI — a Next.js 14 App Router project.
`app/(app)/project/[id]/interview/page.tsx` currently returns `null` while the
`useEffect` fetches the project type from MOCK_PROJECTS. Once real Supabase
data is wired, this will be a visible blank screen for 200-500ms.

Task: Add a proper loading skeleton.

Requirements:
1. Create `components/interview/InterviewSkeleton.tsx`:
   - Mimics the three-panel layout: a 200px left column, a center column,
     and no right panel (preview is hidden until complete).
   - Left column: 4px progress bar placeholder + 10 domain label skeletons
     (alternating 70%/85% width, `bg-vellum-border-light animate-pulse rounded`).
   - Center column: a context bar placeholder + 3 chat bubble skeletons
     (one narrow assistant bubble, one wide assistant bubble, one narrow user bubble),
     all `bg-vellum-border-light animate-pulse rounded-vellum`.
   - No actual text — just geometric shapes.
   - Same height as the full interview layout (`h-[calc(100vh-52px)]`).

2. Update `app/(app)/project/[id]/interview/page.tsx`:
   - Replace the `if (!loaded) return null` with `if (!loaded) return <InterviewSkeleton/>`.
   - Add the custom interview header above the skeleton (so the page doesn't
     visually jump when the skeleton becomes the real content).

3. Add the same `animate-pulse` pattern to `app/(app)/dashboard/page.tsx`
   for the project grid while the Supabase query is in flight:
   - 4 skeleton project cards, same size as real cards, `bg-vellum-border-light
     animate-pulse rounded-vellum`.
   - Shown instead of the grid while `loading === true`.
