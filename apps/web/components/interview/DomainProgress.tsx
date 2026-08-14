"use client";
import { useInterviewStore } from "@/lib/interview/store";
export function DomainProgress({ onRevisit }: { onRevisit?: (id: string) => void }) {
  const { completedDomains, currentDomain, isComplete, activeDomains } = useInterviewStore();
  const goBackToDomain = useInterviewStore(s => s.goBackToDomain);
  const isThinking = useInterviewStore(s => s.isThinking);
  const isStreaming = useInterviewStore(s => s.isStreaming);
  const busy = isThinking || isStreaming;
  const pct = Math.round(completedDomains.length/activeDomains.length*100);
  return (
    <aside className="w-full md:w-[260px] flex-shrink-0 md:border-r border-hairline bg-sidebar-mist flex flex-col overflow-hidden">
      <div className="px-4 pt-3.5 pb-2 text-[11px] font-medium uppercase tracking-wider text-ink-muted">Progress</div>
      <div className="h-1 bg-edge-gray rounded-full mx-4 mb-2.5"><div className="h-full bg-ink rounded-full transition-all" style={{width:`${pct}%`}}/></div>
      <div className="flex-1 overflow-y-auto">
        {activeDomains.map((d)=>{
          const done=completedDomains.includes(d.id), active=d.id===currentDomain&&!isComplete;
          const canGoBack = done && !busy;
          const row = (
            <>
              <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] ${done?"bg-ink text-vellum":active?"border-[1.5px] border-[var(--accent)]":"border-[1.5px] border-vellum-border"}`}>{done&&"✓"}</div>
              <div className={`text-[14px] ${done?"text-ink-muted":active?"text-ink font-medium":"text-ink-faint"}`}>{d.label}</div>
            </>
          );
          return canGoBack ? (
            <button key={d.id} type="button" onClick={()=>{ goBackToDomain(d.id); onRevisit?.(d.id); }} aria-label={`Revisit ${d.label}`} title="Click to revisit this domain" className="group w-full flex items-center gap-2 px-4 py-2 transition-colors hover:bg-hover-veil text-left">
              {row}
              <span className="ml-auto text-[10px] text-ink-faint opacity-0 group-hover:opacity-100 transition-opacity">↩ revisit</span>
            </button>
          ) : (
            <div key={d.id} aria-current={active ? "step" : undefined} className={`flex items-center gap-2 px-4 py-2 transition-colors ${active?"bg-hover-veil":""}`}>
              {row}
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2.5 border-t border-hairline text-[12px] text-ink-muted">{completedDomains.length} / {activeDomains.length} domains</div>
    </aside>
  );
}
