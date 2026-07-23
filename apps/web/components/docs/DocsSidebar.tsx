"use client";
import { cn } from "@/lib/utils";
import { DOMAINS } from "@/lib/interview/domains";
import { MOCK_PROJECTS } from "@/lib/mock-projects";
import type { LibraryDoc } from "@/lib/docs-library";
import type { DomainId } from "@/lib/types";

interface Props { docs:LibraryDoc[]; domainFilter:DomainId|null; projectFilter:string|null; onDomainFilter:(id:DomainId)=>void; onProjectFilter:(name:string)=>void; onReset:()=>void; }

function Item({active,onClick,label,count}:{active:boolean;onClick:()=>void;label:string;count:number}) {
  return (
    <button type="button" onClick={onClick} className={cn("w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] transition-colors text-left",active?"bg-[#fff2ec] text-ink font-medium":"text-ink-muted hover:bg-vellum-border-light hover:text-ink")}>
      {label}<span className="ml-auto text-[11px] text-ink-faint">{count}</span>
    </button>
  );
}

export function DocsSidebar({docs,domainFilter,projectFilter,onDomainFilter,onProjectFilter,onReset}:Props) {
  const domainCounts: Partial<Record<DomainId,number>> = {};
  docs.forEach(d=>{ domainCounts[d.domainId]=(domainCounts[d.domainId]??0)+1; });
  return (
    <aside className="w-[220px] flex-shrink-0 border-r border-vellum-border bg-vellum flex flex-col py-[18px] overflow-y-auto">
      <div className="px-2 mb-[18px]">
        <Item active={!domainFilter&&!projectFilter} onClick={onReset} label="All documents" count={docs.length}/>
      </div>
      <div className="px-2 mb-[18px]">
        <div className="px-2.5 mb-2 text-[10px] font-medium uppercase tracking-wider text-ink-faint">By domain</div>
        {DOMAINS.map(d=>{ const count=domainCounts[d.id]??0; if(!count) return null;
          return <Item key={d.id} active={domainFilter===d.id} onClick={()=>onDomainFilter(d.id)} label={d.label} count={count}/>;
        })}
      </div>
      <div className="h-px bg-vellum-border-light mx-4 mb-4"/>
      <div className="px-2">
        <div className="px-2.5 mb-2 text-[10px] font-medium uppercase tracking-wider text-ink-faint">By project</div>
        {MOCK_PROJECTS.map(p=><Item key={p.id} active={projectFilter===p.name} onClick={()=>onProjectFilter(p.name)} label={p.name} count={p.domainsCompleted}/>)}
      </div>
    </aside>
  );
}
