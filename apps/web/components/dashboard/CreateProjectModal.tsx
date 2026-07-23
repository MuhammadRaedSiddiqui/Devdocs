"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ProjectType } from "@/lib/types";
interface Props { open: boolean; onClose: ()=>void; onCreate: (name:string, type:ProjectType)=>void; }
const TYPES: {id:ProjectType;label:string;icon:string}[] = [
  {id:"saas",label:"SaaS product",icon:"◈"},{id:"api",label:"API service",icon:"⟨⟩"},
  {id:"internal_tool",label:"Internal tool",icon:"⚙"},{id:"mobile",label:"Mobile app",icon:"◻"},
  {id:"landing_page",label:"Landing page",icon:"◇"},{id:"other",label:"Other",icon:"○"},
];
export function CreateProjectModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState(""); const [type, setType] = useState<ProjectType|null>(null);
  if (!open) return null;
  function handleCreate() { if(!name.trim()||!type) return; onCreate(name.trim(),type); setName(""); setType(null); }
  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="bg-vellum rounded-xl w-[480px] overflow-hidden shadow-2xl">
        <div className="px-6 pt-5 pb-4 border-b border-vellum-border">
          <h3 className="font-serif-heading text-lg text-ink">New project</h3>
          <p className="text-[13px] text-ink-muted mt-1">Name your project and pick a type — then the AI takes over.</p>
        </div>
        <div className="px-6 py-5">
          <div className="mb-4">
            <label htmlFor="proj-name" className="block text-[13px] font-medium text-ink mb-1.5">Project name</label>
            <input id="proj-name" type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. TaskFlow SaaS" className="w-full px-3 py-2.5 border border-ink/15 rounded-vellum text-[13px] bg-white text-ink focus:outline-none focus:border-ink/30"/>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-ink mb-1.5">What are you building?</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t=>(
                <button key={t.id} type="button" onClick={()=>setType(t.id)} className={cn("p-2.5 border rounded-lg text-center transition-all bg-white",type===t.id?"border-ink border-[1.5px]":"border-vellum-border hover:border-ink")}>
                  <div className="text-lg mb-1">{t.icon}</div>
                  <div className="text-[11px] font-medium text-ink">{t.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-3.5 border-t border-vellum-border flex gap-2 justify-end bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-vellum-border rounded-lg text-[13px] bg-white text-ink-secondary">Cancel</button>
          <button type="button" disabled={!name.trim()||!type} onClick={handleCreate} className="px-5 py-2 bg-ink text-vellum rounded-lg text-[13px] font-medium disabled:opacity-35 disabled:cursor-not-allowed">Start planning →</button>
        </div>
      </div>
    </div>
  );
}
