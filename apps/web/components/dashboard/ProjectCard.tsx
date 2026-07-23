"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";
import { PROJECT_TYPE_LABELS } from "@/lib/types";
import { PROJECT_TYPE_BADGE_CLASS } from "@/lib/mock-projects";
interface Props { project: Project; onDelete: (id:string)=>void; onDownload: (p:Project)=>void; }
function MenuItem({ label, onClick, danger }: { label:string; onClick:()=>void; danger?:boolean }) {
  return <button type="button" onClick={onClick} className={cn("w-full text-left px-3 py-1.5 text-xs rounded-md",danger?"text-danger hover:bg-danger-bg":"text-ink-secondary hover:bg-vellum")}>{label}</button>;
}
export function ProjectCard({ project, onDelete, onDownload }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const isDone = project.status === "complete";
  const pct = Math.round(project.domainsCompleted/10*100);
  useEffect(() => {
    function h(e:MouseEvent){ if(ref.current&&!ref.current.contains(e.target as Node)) setMenuOpen(false); }
    document.addEventListener("click",h); return ()=>document.removeEventListener("click",h);
  },[]);
  return (
    <div ref={ref} className="bg-white border border-vellum-border rounded-vellum overflow-hidden cursor-pointer transition-all hover:border-ink-secondary hover:-translate-y-px relative" onClick={()=>router.push(`/project/${project.id}/interview`)}>
      <div className="p-4 pb-3.5 border-b border-vellum-border-light">
        <div className="flex items-center justify-between mb-2.5">
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",PROJECT_TYPE_BADGE_CLASS[project.type])}>{PROJECT_TYPE_LABELS[project.type]}</span>
          <button type="button" onClick={(e)=>{e.stopPropagation();setMenuOpen(v=>!v);}} className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-ink-faint hover:bg-vellum hover:text-ink">⋯</button>
        </div>
        <div className="font-serif-heading text-[15px] text-ink leading-tight mb-1">{project.name}</div>
        <div className="text-xs text-ink-muted leading-snug line-clamp-2">{project.description}</div>
      </div>
      <div className="px-4 py-3 flex items-center justify-between bg-vellum">
        <div className="flex items-center gap-2 flex-1 mr-2.5">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:isDone?"#141413":"#d97757"}}/>
          <div className="flex-1 max-w-[80px] h-[3px] bg-vellum-border rounded-full"><div className="h-full rounded-full" style={{width:`${pct}%`,background:isDone?"#141413":"#d97757"}}/></div>
          <span className="text-[11px] text-ink-faint whitespace-nowrap">{isDone?"Complete":`${project.domainsCompleted}/10`}</span>
        </div>
        <span className="text-[11px] text-ink-faint whitespace-nowrap">{project.updatedAt}</span>
      </div>
      {menuOpen&&(
        <div className="absolute top-[44px] right-3 bg-white border border-vellum-border rounded-lg p-1 min-w-[140px] shadow-lg z-20" onClick={e=>e.stopPropagation()}>
          <MenuItem label={isDone?"View document":"Continue interview"} onClick={()=>router.push(`/project/${project.id}/interview`)}/>
          <MenuItem label="Rename" onClick={()=>setMenuOpen(false)}/>
          <MenuItem label="Download .md" onClick={()=>{onDownload(project);setMenuOpen(false);}}/>
          <MenuItem label="Delete" danger onClick={()=>{onDelete(project.id);setMenuOpen(false);}}/>
        </div>
      )}
    </div>
  );
}
