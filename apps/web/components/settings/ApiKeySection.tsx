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

interface Props {
  onConnectedChange: (provider: AIProvider, connected: boolean) => void;
  onToast: (msg: string) => void;
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

export function ApiKeySection({ onConnectedChange, onToast }: Props) {
  const { getToken } = useAuth();
  const [activeTab,     setActiveTab]     = useState<AIProvider>("anthropic");
  const [activeProvider, setActiveProvider] = useState<AIProvider>("anthropic");
  const [states, setStates] = useState<Record<AIProvider, ProviderState>>({
    anthropic: defaultProviderState(),
    openai:    defaultProviderState(),
  });

  // Load stored key metadata (masked, never raw) from the API on mount.
  // The active-provider *preference* is a non-secret UI setting kept locally.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await fetchKeys(getToken);
        if (cancelled) return;
        const saved: Record<AIProvider, ProviderState> = {
          anthropic: defaultProviderState(),
          openai:    defaultProviderState(),
        };
        stored.forEach(k => {
          saved[k.provider] = {
            ...saved[k.provider],
            connected: true,
            maskedKey: k.maskedKey,
            lastVerified: "previously",
          };
        });
        setStates(saved);
      } catch {
        if (!cancelled) onToast("Could not load saved API keys");
      }
    })();
    const active = (localStorage.getItem(ACTIVE_PROVIDER_KEY) ?? "anthropic") as AIProvider;
    setActiveProvider(active);
    return () => { cancelled = true; };
  }, [getToken, onToast]);

  function update(provider: AIProvider, patch: Partial<ProviderState>) {
    setStates(prev => ({ ...prev, [provider]: { ...prev[provider], ...patch } }));
  }

  async function handleVerify(provider: AIProvider) {
    const key = states[provider].keyInput.trim();
    if (!key) { onToast("Enter your API key first"); return; }
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
    onToast(`${provider === "anthropic" ? "Anthropic" : "OpenAI"} API key verified and saved`);
  }

  async function handleRemove(provider: AIProvider) {
    const ok = await deleteKey(getToken, provider);
    if (!ok) { onToast("Failed to remove API key"); return; }

    // If this was the active provider, move the preference to the other
    // connected provider if one exists.
    if (activeProvider === provider) {
      const other: AIProvider = provider === "anthropic" ? "openai" : "anthropic";
      if (states[other].connected) {
        localStorage.setItem(ACTIVE_PROVIDER_KEY, other);
        setActiveProvider(other);
      } else {
        localStorage.removeItem(ACTIVE_PROVIDER_KEY);
      }
    }
    update(provider, { connected: false, maskedKey: "", lastVerified: "", showRemove: false });
    onConnectedChange(provider, false);
    onToast(`${provider === "anthropic" ? "Anthropic" : "OpenAI"} API key removed`);
  }

  function handleSetActiveProvider(provider: AIProvider) {
    if (!states[provider].connected) return;
    localStorage.setItem(ACTIVE_PROVIDER_KEY, provider);
    setActiveProvider(provider);
    onToast(`Switched to ${provider === "anthropic" ? "Anthropic Claude" : "OpenAI GPT-4o"}`);
  }

  const s = states[activeTab];
  const providerLabel = activeTab === "anthropic" ? "Anthropic" : "OpenAI";

  return (
    <div className="max-w-[640px]">
      <PageHeader title="API Key" sub="DevDocs AI uses your own API key — Bring Your Own Key (BYOK)." />

      {/* BYOK callout */}
      <div className="flex gap-2.5 p-3.5 rounded-lg border-l-[3px] mb-4" style={{ borderLeftColor: "#0F6E56", background: "#F0FDFA" }}>
        <span className="text-sm flex-shrink-0 mt-0.5">🔒</span>
        <div className="text-[12.5px] leading-snug" style={{ color: "#0a4a3d" }}>
          <strong className="font-medium">Your API keys are encrypted and stored securely.</strong> Keys are
          sent once over HTTPS to the DevDocs AI server, verified, and encrypted at rest with AES-256-GCM.
          They&apos;re never returned to the browser after saving, and all AI calls are made server-side —
          your key is never exposed to client code.
        </div>
      </div>

      {/* Provider tabs */}
      <Card title="API Keys" sub="Add keys for one or both providers. You can switch between them at any time.">
        <div className="flex gap-1.5 mb-4">
          {(["anthropic", "openai"] as AIProvider[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setActiveTab(p)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors border ${
                activeTab === p ? "bg-ink text-vellum border-ink" : "bg-white text-ink-muted border-vellum-border hover:text-ink"
              }`}
            >
              {p === "anthropic" ? "Anthropic" : "OpenAI"}
              {states[p].connected && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#1D9E75" }} />
              )}
            </button>
          ))}
        </div>

        {/* Connected state */}
        {s.connected && !s.showInput ? (
          <>
            <div className="flex items-center justify-between p-3.5 bg-vellum border border-vellum-border rounded-lg">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#1D9E75" }} />
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
                className="px-4 py-1.5 border rounded-lg text-xs"
                style={{ borderColor: "#f3c4c4", color: "#c0392b" }}
              >
                Remove key
              </button>
            </div>

            {s.showRemove && (
              <div
                className="flex gap-2.5 p-3.5 rounded-lg border-l-[3px] mt-3.5"
                style={{ borderLeftColor: "#c0392b", background: "#fdf2f2" }}
              >
                <span className="text-sm">⚠</span>
                <div className="text-[12.5px]" style={{ color: "#7a2418" }}>
                  Remove your {providerLabel} key? You won&apos;t be able to use it for
                  interviews until you add it again.
                  <div className="flex gap-2 mt-2.5">
                    <button
                      type="button"
                      onClick={() => handleRemove(activeTab)}
                      className="px-3.5 py-1.5 rounded-lg text-xs text-white"
                      style={{ background: "#c0392b" }}
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
                placeholder={activeTab === "anthropic" ? "sk-ant-api03-..." : "sk-..."}
                className="w-full px-3 py-2.5 border border-ink/15 rounded-lg text-[13px] bg-white text-ink font-mono focus:outline-none focus:border-ink/30"
              />
              {s.verifyError && (
                <div className="text-[11px] mt-1.5" style={{ color: "#c0392b" }}>{s.verifyError}</div>
              )}
              <div className="text-[11px] text-ink-faint mt-1.5">
                {activeTab === "anthropic" ? (
                  <>Get your key at{" "}
                    <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-ink underline">console.anthropic.com</a>
                  </>
                ) : (
                  <>Get your key at{" "}
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-ink underline">platform.openai.com</a>
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
          {(["anthropic", "openai"] as AIProvider[]).map(p => {
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
                    {p === "anthropic" ? "Anthropic Claude" : "OpenAI"}
                  </div>
                  <div className="text-[11px] text-ink-faint mt-0.5">
                    {PROVIDER_MODELS[p].label} · {PROVIDER_MODELS[p].default}
                  </div>
                  {!connected && (
                    <div className="text-[11px] mt-0.5" style={{ color: "#9c9a92" }}>
                      Add a key above to enable
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  {isActive && connected && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium badge-green">Active</span>
                  )}
                  {!connected && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#ece9e1] text-ink-muted">No key</span>
                  )}
                  {/* Radio circle */}
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isActive && connected ? "border-ink" : "border-vellum-border"
                  }`}>
                    {isActive && connected && <div className="w-2 h-2 rounded-full bg-ink" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-ink-faint mt-3">
          DevDocs AI doesn&apos;t track your API usage or costs. Monitor usage in the{" "}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-ink underline">Anthropic Console</a>
          {" "}or{" "}
          <a href="https://platform.openai.com/usage" target="_blank" rel="noreferrer" className="text-ink underline">OpenAI dashboard</a>
          .
        </div>
      </Card>
    </div>
  );
}
