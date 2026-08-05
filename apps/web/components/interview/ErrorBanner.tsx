"use client";
import { useInterviewStore } from "@/lib/interview/store";
import Link from "next/link";

export function ErrorBanner() {
  const lastError = useInterviewStore(s => s.lastError);
  const clearError = useInterviewStore(s => s.clearError);
  const sendMessage = useInterviewStore(s => s.sendMessage);

  if (!lastError) return null;

  function handleRetry() {
    const msg = lastError!.lastUserMessage;
    clearError();
    if (msg) sendMessage(msg);
  }

  return (
    <div
      className="mx-5 mt-2 flex items-start gap-3 rounded-vellum border border-vellum-border border-l-[3px] bg-white px-4 py-3"
      style={{ borderLeftColor: "var(--terracotta, #d97757)" }}
    >
      <div className="flex-1 text-[13px] leading-relaxed text-ink-secondary">
        {lastError.message}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {lastError.type === "auth" && (
          <Link
            href="/settings?section=apikey"
            className="px-3 py-1.5 text-[12px] font-medium text-terracotta border border-terracotta/30 rounded-vellum hover:bg-[#fff8f5]"
          >
            Check API key
          </Link>
        )}
        {lastError.lastUserMessage && (
          <button
            type="button"
            onClick={handleRetry}
            className="px-3 py-1.5 text-[12px] font-medium bg-ink text-vellum rounded-vellum"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
