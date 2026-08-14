"use client";
import { useInterviewStore } from "@/lib/interview/store";
import Link from "next/link";

export function ErrorBanner() {
  const lastError = useInterviewStore(s => s.lastError);
  const retryLast = useInterviewStore(s => s.retryLast);

  if (!lastError) return null;

  const isRateLimit = lastError.type === "rate_limit";

  function handleRetry() {
    if (isRateLimit) return;
    retryLast();
  }

  return (
    <div
      className="mx-5 mt-2 flex items-start gap-3 rounded-vellum border border-vellum-border border-l-[3px] bg-white px-4 py-3"
      style={{ borderLeftColor: "var(--color-graphite-ink)" }}
    >
      <div className="flex-1 text-[13px] leading-relaxed text-ink-secondary">
        {lastError.message}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {lastError.type === "auth" && (
          <Link
            href="/settings?section=apikey"
            className="px-3 py-1.5 text-[12px] font-medium text-ink border border-hairline rounded-lg hover:bg-hover-veil"
          >
            Check API key
          </Link>
        )}
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRateLimit}
          className="px-3 py-1.5 text-[12px] font-medium bg-ink text-vellum rounded-vellum disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
