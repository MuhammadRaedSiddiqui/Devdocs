"use client";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";
interface Props { projects: Project[]; statusFilter: "all"|"in_progress"|"complete"; typeFilter: string|null; onStatusFilter: (s: "all"|"in_progress"|"complete")=>void; onTypeFilter: (t: string)=>void; onNewProject: ()=>void; projectsUsed: number; projectsLimit: number; }
const TYPE_FILTERS = [{ id:"saas",label:"SaaS products"},{ id:"api",label:"API services"},{ id:"internal_tool",label:"Internal tools"}];
export function DashboardSidebar({ projects, statusFilter, typeFilter, onStatusFilter, onTypeFilter, onNewProject, projectsUsed, projectsLimit }: Props) {
  const counts = { all: projects.length, in_progress: projects.filter(p=>p.status==="in_progress").length, complete: projects.filter(p=>p.status==="complete").length };
  const pct = Math.round(projectsUsed/projectsLimit*100);
  return (
    <aside className="w-[220px] flex-shrink-0 border-r border-vellum-border bg-vellum flex flex-col py-5 overflow-y-auto">
      <div className="px-4 mb-5">
        <button type="button" onClick={onNewProject} className="w-full py-2.5 px-3.5 bg-ink text-vellum rounded-vellum text-[13px] font-medium flex items-center gap-2 hover:bg-ink-secondary transition-colors">
          <span className="text-base leading-none">+</span> New project
        </button>
      </div>
      <div className="px-2 mb-5">
        <div className="px-2 mb-2 text-[10px] font-medium uppercase tracking-wider text-ink-faint">Views</div>
        {[{s:"all"as const,l:"All projects"},{s:"in_progress"as const,l:"In progress",dot:"#d97757"},{s:"complete"as const,l:"Complete",dot:"#141413"}].map(({s,l,dot})=>(
          <button key={s} type="button" onClick={()=>onStatusFilter(s)} className={cn("w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] transition-colors text-left mb-0.5",statusFilter===s&&!typeFilter?"bg-[#fff2ec] text-ink font-medium":"text-ink-muted hover:bg-vellum-border-light hover:text-ink")}>
            {dot&&<span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:dot}}/>}{l}
            <span className="ml-auto text-[11px] text-ink-faint">{counts[s]}</span>
          </button>
        ))}
      </div>
      <div className="h-px bg-vellum-border-light mx-4 mb-4"/>
      <div className="px-2 mb-5">
        <div className="px-2 mb-2 text-[10px] font-medium uppercase tracking-wider text-ink-faint">By type</div>
        {TYPE_FILTERS.map(t=>(
          <button key={t.id} type="button" onClick={()=>onTypeFilter(t.id)} className={cn("w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] transition-colors text-left mb-0.5",typeFilter===t.id?"bg-[#fff2ec] text-ink font-medium":"text-ink-muted hover:bg-vellum-border-light hover:text-ink")}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-auto mx-4 p-3.5 bg-white border border-vellum-border rounded-vellum">
        <div className="text-[11px] text-ink-muted mb-1.5">Free plan · {projectsUsed} of {projectsLimit} projects</div>
        <div className="h-1 bg-vellum-border rounded-full mb-1.5"><div className="h-full bg-terracotta rounded-full" style={{width:`${pct}%`}}/></div>
        <div className="text-[11px] text-ink-faint">Need more? <a href="/settings" className="text-ink font-medium underline">Upgrade →</a></div>
      </div>
    </aside>
  );
}
