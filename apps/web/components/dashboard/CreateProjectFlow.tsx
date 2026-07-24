"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import type { ProjectType } from "@/lib/types";
import { PROVIDER_MODELS, ACTIVE_PROVIDER_KEY, type AIProvider } from "@/lib/ai/provider";
import { fetchKeys, saveKey } from "@/lib/ai/keys";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, type: ProjectType) => void;
}

const PROJECT_TYPES: { id: ProjectType; label: string; icon: string }[] = [
  { id: "saas", label: "SaaS product", icon: "◈" },
  { id: "api", label: "API service", icon: "⟨⟩" },
  { id: "internal_tool", label: "Internal tool", icon: "⚙" },
  { id: "mobile", label: "Mobile app", icon: "◻" },
  { id: "landing_page", label: "Landing page", icon: "◇" },
  { id: "other", label: "Other", icon: "○" },
];

type Step = "project-details" | "api-setup" | "api-verify";

export function CreateProjectFlow({ open, onClose, onCreate }: Props) {
  const { getToken } = useAuth();
  const [step, setStep] = useState<Step>("project-details");
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType | null>(null);

  // API key state
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [checkingKeys, setCheckingKeys] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Check if user already has API keys when modal opens
  useEffect(() => {
    if (!open) return;

    setCheckingKeys(true);
    fetchKeys(getToken)
      .then(keys => {
        if (keys.length > 0) {
          setHasExistingKey(true);
          setStep("project-details");
        } else {
          setHasExistingKey(false);
          setStep("project-details");
        }
      })
      .catch(() => {
        setHasExistingKey(false);
      })
      .finally(() => {
        setCheckingKeys(false);
      });
  }, [open, getToken]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep("project-details");
      setName("");
      setType(null);
      setSelectedProvider("anthropic");
      setApiKey("");
      setVerifyError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleContinueToApiSetup = () => {
    if (!name.trim() || !type) return;
    if (hasExistingKey) {
      // Skip to creation if they already have a key
      onCreate(name.trim(), type);
      return;
    }
    setStep("api-setup");
  };

  const handleSelectProvider = (provider: AIProvider) => {
    setSelectedProvider(provider);
    setApiKey("");
    setVerifyError(null);
    setStep("api-verify");
  };

  const handleVerifyAndCreate = async () => {
    const key = apiKey.trim();
    if (!key) {
      setVerifyError("Enter your API key");
      return;
    }

    setVerifying(true);
    setVerifyError(null);

    const { maskedKey, error } = await saveKey(getToken, selectedProvider, key);

    if (error || !maskedKey) {
      setVerifying(false);
      setVerifyError(error ?? "Failed to verify API key");
      return;
    }

    // Set as active provider
    localStorage.setItem(ACTIVE_PROVIDER_KEY, selectedProvider);

    setVerifying(false);

    // Create project
    onCreate(name.trim(), type!);
  };

  const handleBack = () => {
    if (step === "api-verify") {
      setStep("api-setup");
      setApiKey("");
      setVerifyError(null);
    } else if (step === "api-setup") {
      setStep("project-details");
    }
  };

  const providerLabel = selectedProvider === "anthropic" ? "Anthropic" : "OpenAI";

  return (
    <div
      className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-vellum rounded-xl w-[520px] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-vellum-border">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-serif-heading text-lg text-ink">
              {step === "project-details" && "New project"}
              {step === "api-setup" && "Choose AI provider"}
              {step === "api-verify" && `Connect ${providerLabel}`}
            </h3>
            {(step === "api-setup" || step === "api-verify") && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-vellum-border text-ink-muted font-medium">
                Step {step === "api-setup" ? "2" : "3"} of 3
              </span>
            )}
          </div>
          <p className="text-[13px] text-ink-muted">
            {step === "project-details" && checkingKeys && "Checking your API keys..."}
            {step === "project-details" && !checkingKeys && hasExistingKey && "Name your project and pick a type — then the AI takes over."}
            {step === "project-details" && !checkingKeys && !hasExistingKey && "First, set up your project. Then we'll connect your API key."}
            {step === "api-setup" && "DevDocs AI supports Anthropic Claude and OpenAI GPT-4o."}
            {step === "api-verify" && "Enter your API key. It's encrypted and stored securely — never exposed to your browser."}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {step === "project-details" && (
            <>
              <div className="mb-4">
                <label htmlFor="proj-name" className="block text-[13px] font-medium text-ink mb-1.5">
                  Project name
                </label>
                <input
                  id="proj-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. TaskFlow SaaS"
                  className="w-full px-3 py-2.5 border border-ink/15 rounded-vellum text-[13px] bg-white text-ink focus:outline-none focus:border-ink/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-ink mb-1.5">
                  What are you building?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PROJECT_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={cn(
                        "p-2.5 border rounded-lg text-center transition-all bg-white",
                        type === t.id
                          ? "border-ink border-[1.5px]"
                          : "border-vellum-border hover:border-ink"
                      )}
                    >
                      <div className="text-lg mb-1">{t.icon}</div>
                      <div className="text-[11px] font-medium text-ink">{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === "api-setup" && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => handleSelectProvider("anthropic")}
                className="flex items-start gap-3 p-4 border-2 border-vellum-border rounded-lg hover:border-ink transition-colors bg-white text-left"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center text-base">
                  🧠
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-ink mb-0.5">Anthropic Claude</div>
                  <div className="text-[12px] text-ink-muted">{PROVIDER_MODELS.anthropic.label}</div>
                </div>
                <div className="text-xl text-ink-faint">→</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectProvider("openai")}
                className="flex items-start gap-3 p-4 border-2 border-vellum-border rounded-lg hover:border-ink transition-colors bg-white text-left"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center text-base">
                  ✨
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-ink mb-0.5">OpenAI</div>
                  <div className="text-[12px] text-ink-muted">{PROVIDER_MODELS.openai.label}</div>
                </div>
                <div className="text-xl text-ink-faint">→</div>
              </button>

              <div
                className="flex gap-2.5 p-3 rounded-lg border-l-[3px] mt-1"
                style={{ borderLeftColor: "#0F6E56", background: "#F0FDFA" }}
              >
                <span className="text-sm flex-shrink-0 mt-0.5">🔒</span>
                <div className="text-[11.5px] leading-relaxed" style={{ color: "#0a4a3d" }}>
                  <strong className="font-medium">Your key is encrypted at rest.</strong> Keys are
                  verified and encrypted server-side with AES-256-GCM. All AI calls happen from our
                  server — your key never reaches browser code.
                </div>
              </div>
            </div>
          )}

          {step === "api-verify" && (
            <>
              <div className="mb-4">
                <label htmlFor="api-key-input" className="block text-[13px] font-medium text-ink mb-1.5">
                  {providerLabel} API key
                </label>
                <input
                  id="api-key-input"
                  type="text"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setVerifyError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyAndCreate()}
                  placeholder={selectedProvider === "anthropic" ? "sk-ant-api03-..." : "sk-..."}
                  className="w-full px-3 py-2.5 border border-ink/15 rounded-lg text-[13px] bg-white text-ink font-mono focus:outline-none focus:border-ink/30"
                  autoFocus
                />
                {verifyError && (
                  <div className="text-[11px] mt-1.5" style={{ color: "#c0392b" }}>
                    {verifyError}
                  </div>
                )}
                <div className="text-[11px] text-ink-faint mt-1.5">
                  {selectedProvider === "anthropic" ? (
                    <>
                      Get your key at{" "}
                      <a
                        href="https://console.anthropic.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-ink underline"
                      >
                        console.anthropic.com
                      </a>
                    </>
                  ) : (
                    <>
                      Get your key at{" "}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-ink underline"
                      >
                        platform.openai.com
                      </a>
                    </>
                  )}
                </div>
              </div>

              <div
                className="flex gap-2.5 p-3 rounded-lg border-l-[3px]"
                style={{ borderLeftColor: "#9c9a92", background: "#f8f7f4" }}
              >
                <span className="text-sm flex-shrink-0 mt-0.5">💡</span>
                <div className="text-[11.5px] leading-relaxed text-ink-secondary">
                  You can add more providers or change your active provider later in Settings → API Key.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-vellum-border flex gap-2 justify-between bg-white">
          <div>
            {(step === "api-setup" || step === "api-verify") && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 border border-vellum-border rounded-lg text-[13px] bg-white text-ink-secondary hover:border-ink"
              >
                ← Back
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-vellum-border rounded-lg text-[13px] bg-white text-ink-secondary"
            >
              Cancel
            </button>

            {step === "project-details" && (
              <button
                type="button"
                disabled={!name.trim() || !type || checkingKeys}
                onClick={handleContinueToApiSetup}
                className="px-5 py-2 bg-ink text-vellum rounded-lg text-[13px] font-medium disabled:opacity-35 disabled:cursor-not-allowed"
              >
                {hasExistingKey ? "Start planning →" : "Continue →"}
              </button>
            )}

            {step === "api-verify" && (
              <button
                type="button"
                disabled={verifying || !apiKey.trim()}
                onClick={handleVerifyAndCreate}
                className="px-5 py-2 bg-ink text-vellum rounded-lg text-[13px] font-medium disabled:opacity-35 disabled:cursor-not-allowed"
              >
                {verifying ? "Verifying..." : "Verify & start planning →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
