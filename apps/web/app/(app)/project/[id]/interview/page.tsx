"use client";

import { useEffect, useRef, useState } from "react";
import { DiscoveryForm } from "@/components/interview/DiscoveryForm";
import { DomainProgress } from "@/components/interview/DomainProgress";
import { ChatPanel } from "@/components/interview/ChatPanel";
import { PreviewPanel } from "@/components/interview/PreviewPanel";
import { useInterviewStore } from "@/lib/interview/store";
import { DOMAINS } from "@/lib/interview/domains";
import { getActiveConfig } from "@/lib/ai/provider";
import { setAISession } from "@/lib/ai/provider";
import { trpc } from "@/lib/trpc";
import type { ChatMessage, DomainId, ProjectContext, ProjectType } from "@/lib/types";
import { useAuth } from "@clerk/nextjs";

type SavedInterviewData = {
  lockedContext?: ProjectContext | null;
  lockedChoices?: Partial<Record<DomainId, Record<string, string>>>;
  completedDomains?: DomainId[];
  domainContent?: Partial<Record<DomainId, string>>;
  conversationHistory?: ChatMessage[];
  elaboration?: string;
};

function readSavedInterviewData(value: unknown): SavedInterviewData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as SavedInterviewData;
}

export default function InterviewPage({ params }: { params: { id: string } }) {
  const store = useInterviewStore();
  const { getToken } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const hasHydrated = useRef(false);
  const projectQuery = trpc.projects.get.useQuery({ id: params.id });
  const saveInterview = trpc.projects.update.useMutation();

  const pct = Math.round(store.completedDomains.length / DOMAINS.length * 100);

  // Hydrate once per project. Resetting prevents Zustand state from a
  // previously visited project appearing while this project's data loads.
  useEffect(() => {
    hasHydrated.current = false;
    setHydrated(false);
    store.reset();
  }, [params.id]);

  useEffect(() => {
    if (!projectQuery.data || hasHydrated.current) return;

    const saved = readSavedInterviewData(projectQuery.data.interviewData);
    if (saved?.lockedContext) {
      store.resumeFromSaved({
        lockedContext: saved.lockedContext,
        lockedChoices: saved.lockedChoices ?? {},
        completedDomains: saved.completedDomains ?? [],
        domainContent: saved.domainContent ?? {},
        conversationHistory: saved.conversationHistory ?? [],
        elaboration: saved.elaboration ?? "",
      });
    }

    setAISession(params.id, getToken);
    const config = getActiveConfig();
    if (config) store.setProvider(config.provider);
    hasHydrated.current = true;
    setHydrated(true);
  }, [projectQuery.data]);

  // Persist only stable interview content. Streaming and UI-only state is
  // deliberately excluded, and a debounce avoids one request per keystroke.
  useEffect(() => {
    if (!hydrated || !store.lockedContext || saveInterview.isPending) return;

    const timeout = window.setTimeout(() => {
      saveInterview.mutate({
        id: params.id,
        data: {
          interviewData: {
            lockedContext: store.lockedContext,
            lockedChoices: store.lockedChoices,
            completedDomains: store.completedDomains,
            domainContent: store.domainContent,
            conversationHistory: store.messages,
            elaboration: store.elaboration,
            schemaTables: store.schemaTables,
            schemaConfirmed: store.schemaConfirmed,
          },
        },
      });
    }, 750);

    return () => window.clearTimeout(timeout);
  }, [
    hydrated,
    params.id,
    store.lockedContext,
    store.lockedChoices,
    store.completedDomains,
    store.domainContent,
    store.messages,
    store.elaboration,
    store.schemaTables,
    store.schemaConfirmed,
  ]);

  if (projectQuery.isLoading || !hydrated) {
    return <div className="min-h-screen grid place-items-center text-sm text-ink-muted">Loading project...</div>;
  }

  if (projectQuery.error || !projectQuery.data) {
    return <div className="min-h-screen grid place-items-center text-sm text-danger">Unable to load this project.</div>;
  }

  const projectType = projectQuery.data.type as ProjectType;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="h-[52px] border-b border-vellum-border bg-vellum flex items-center px-7 gap-2.5 flex-shrink-0">
        <span className="font-serif-heading text-[17px] text-ink">DevDocs AI</span>
        <span className="text-[13px] text-ink-muted">{projectQuery.data.name}</span>
        <div className="ml-auto flex items-center gap-2">
          {store.currentProvider && (
            <span className="text-[11px] px-2.5 py-1 rounded-full border border-vellum-border text-ink-faint bg-white">
              {store.currentProvider === "anthropic" ? "Anthropic" : "OpenAI"}
            </span>
          )}
          <span className="text-[11px] px-3 py-1 rounded-full font-medium bg-[#ccdbe8] text-[#0c447c]">
            {pct}% complete
          </span>
        </div>
      </header>

      {!store.lockedContext ? (
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-white">
          <DiscoveryForm projectType={projectType} onSubmit={store.setLockedContext} />
        </div>
      ) : (
        <div className="flex flex-row h-[calc(100vh-52px)] overflow-hidden">
          <DomainProgress />
          <ChatPanel />
          <PreviewPanel />
        </div>
      )}
    </div>
  );
}
