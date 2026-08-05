"use client";
import { useInterviewStore } from "@/lib/interview/store";
export function DomainProgress() {
  const { completedDomains, currentDomain, isComplete, activeDomains } = useInterviewStore();
  const pct = Math.round(completedDomains.length/activeDomains.length*100);
  return (
    <aside className="w-full md:w-[200px] flex-shrink-0 md:border-r border-vellum-border bg-vellum flex flex-col overflow-hidden">
      <div className="px-4 pt-3.5 pb-2 text-[11px] font-medium uppercase tracking-wider text-ink-muted">Progress</div>
      <div className="h-1 bg-vellum-border rounded-full mx-4 mb-2.5"><div className="h-full bg-ink rounded-full transition-all" style={{width:`${pct}%`}}/></div>
      <div className="flex-1 overflow-y-auto">
        {activeDomains.map((d)=>{
          const done=completedDomains.includes(d.id), active=d.id===currentDomain&&!isComplete;
          return (
            <div key={d.id} className={`flex items-center gap-2 px-4 py-2.5 transition-colors ${active?"bg-[#fff2ec]":""}`}>
              <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] ${done?"bg-ink text-vellum":active?"border-[1.5px] border-terracotta":"border-[1.5px] border-vellum-border"}`}>{done&&"✓"}</div>
              <div className={`text-[13px] ${done?"text-ink-faint":active?"text-ink font-medium":"text-ink-faint"}`}>{d.label}</div>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2.5 border-t border-vellum-border text-[11px] text-ink-muted">{completedDomains.length} / {activeDomains.length} domains</div>
    </aside>
  );
}
