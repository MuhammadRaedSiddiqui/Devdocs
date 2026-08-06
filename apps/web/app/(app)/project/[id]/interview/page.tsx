"use client";

import { useEffect, useRef, useState } from "react";
import { DiscoveryForm } from "@/components/interview/DiscoveryForm";
import { DomainProgress } from "@/components/interview/DomainProgress";
import { ChatPanel } from "@/components/interview/ChatPanel";
import { PreviewPanel } from "@/components/interview/PreviewPanel";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { InterviewSkeleton } from "@/components/interview/InterviewSkeleton";
import { useInterviewStore } from "@/lib/interview/store";
import { getActiveConfig } from "@/lib/ai/provider";
import { setAISession } from "@/lib/ai/provider";
import type { AIProvider } from "@/lib/ai/provider";
import { trpc } from "@/lib/trpc";
import type { ChatMessage, DomainId, ProjectContext, ProjectType } from "@/lib/types";
import { useAuth } from "@clerk/nextjs";

const PROVIDER_LABELS: Record<AIProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  bedrock: "Bedrock",
  metamuse: "Meta Muse",
};

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
  const [domainsSheet, setDomainsSheet] = useState(false);
  const [previewSheet, setPreviewSheet] = useState(false);
  const projectQuery = trpc.projects.get.useQuery({ id: params.id });
  const saveInterview = trpc.projects.update.useMutation();

  const pct = Math.round(store.completedDomains.length / store.activeDomains.length * 100);

  useEffect(() => {
    hasHydrated.current = false;
    setHydrated(false);
    store.reset();
  }, [params.id]);

  useEffect(() => {
    if (!projectQuery.data || hasHydrated.current) return;

    const saved = readSavedInterviewData(projectQuery.data.interviewData);

    // Set up token getter and project ID immediately
    store.setProjectId(params.id);
    store.setTokenGetter(getToken);
    store.setProjectName(projectQuery.data.name);
    setAISession(params.id, getToken);
    const config = getActiveConfig();
    if (config) store.setProvider(config.provider);

    if (saved?.lockedContext) {
      const hasHistory = (saved.conversationHistory ?? []).length > 0;
      if (hasHistory) {
        store.resumeFromSaved({
          lockedContext: saved.lockedContext,
          lockedChoices: saved.lockedChoices ?? {},
          completedDomains: saved.completedDomains ?? [],
          domainContent: saved.domainContent ?? {},
          conversationHistory: saved.conversationHistory ?? [],
          elaboration: saved.elaboration ?? "",
        });
      } else {
        store.resumeFromSaved({
          lockedContext: saved.lockedContext,
          lockedChoices: saved.lockedChoices ?? {},
          completedDomains: [],
          domainContent: {},
          conversationHistory: [],
          elaboration: saved.elaboration ?? "",
        });
        store.setLockedContext(saved.lockedContext);
      }

      // Initialize session logging after everything is set up
      if (!store.isComplete) {
        store.initializeSession(getToken);
      }
    }

    hasHydrated.current = true;
    setHydrated(true);
  }, [projectQuery.data, params.id, getToken, store]);

  const hasSavedContext = useRef(false);
  useEffect(() => {
    if (!hydrated || !store.lockedContext || saveInterview.isPending) return;

    const isFirstContextSave = !hasSavedContext.current && !!store.lockedContext;
    const delay = isFirstContextSave ? 0 : 750;

    const timeout = window.setTimeout(() => {
      if (isFirstContextSave) hasSavedContext.current = true;
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
    }, delay);

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
    return <InterviewSkeleton />;
  }

  if (projectQuery.error || !projectQuery.data) {
    return <div className="min-h-screen grid place-items-center text-sm text-danger">Unable to load this project.</div>;
  }

  const projectType = projectQuery.data.type as ProjectType;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="h-[52px] border-b border-vellum-border bg-vellum flex items-center px-4 md:px-7 gap-2.5 flex-shrink-0">
        <span className="font-serif-heading text-[17px] text-ink">DevDocs AI</span>
        <span className="text-[13px] text-ink-muted hidden sm:inline">{projectQuery.data.name}</span>
        <div className="ml-auto flex items-center gap-2">
          {store.currentProvider && (
            <span className="text-[11px] px-2.5 py-1 rounded-full border border-vellum-border text-ink-faint bg-white hidden sm:inline">
              {PROVIDER_LABELS[store.currentProvider] ?? store.currentProvider}
            </span>
          )}
          <span className="text-[11px] px-3 py-1 rounded-full font-medium bg-[#ccdbe8] text-[#0c447c]">
            {pct}%
          </span>
        </div>
      </header>

      {!store.lockedContext ? (
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-white">
          <DiscoveryForm projectType={projectType} onSubmit={store.setLockedContext} />
        </div>
      ) : (
        <>
          {/* Desktop: three-panel layout */}
          <div className="hidden md:flex flex-row h-[calc(100vh-52px)] overflow-hidden">
            <DomainProgress />
            <ChatPanel />
            <PreviewPanel />
          </div>

          {/* Mobile: chat only + bottom nav */}
          <div className="flex md:hidden flex-col h-[calc(100vh-52px-56px)] overflow-hidden">
            <ChatPanel />
          </div>

          {/* Mobile bottom navigation */}
          <div className="md:hidden h-14 border-t border-vellum-border bg-vellum flex items-center justify-around flex-shrink-0">
            <button
              type="button"
              onClick={() => setDomainsSheet(true)}
              className="flex flex-col items-center gap-0.5 text-ink-muted"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-ink-muted">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="text-[10px]">Domains</span>
            </button>
            {store.isComplete && (
              <button
                type="button"
                onClick={() => setPreviewSheet(true)}
                className="flex flex-col items-center gap-0.5 text-ink-muted"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-ink-muted">
                  <path d="M4 3h8l4 4v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[10px]">Document</span>
              </button>
            )}
          </div>

          {/* Bottom sheets for mobile */}
          <BottomSheet open={domainsSheet} onClose={() => setDomainsSheet(false)} title="Interview Progress">
            <DomainProgress />
          </BottomSheet>
          {store.isComplete && (
            <BottomSheet open={previewSheet} onClose={() => setPreviewSheet(false)} title="DOCUMENTATION.md">
              <PreviewPanel />
            </BottomSheet>
          )}
        </>
      )}
    </div>
  );
}
