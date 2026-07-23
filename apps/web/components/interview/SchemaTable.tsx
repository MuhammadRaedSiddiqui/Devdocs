"use client";
import { useState } from "react";
import type { SchemaTables } from "@/lib/types";

interface Props { tables: SchemaTables; interactive: boolean; onAddField: (table:string,field:string,type:string,note:string)=>void; onHelp: ()=>void; onConfirm: ()=>void; }

export function SchemaTable({ tables, interactive, onAddField, onHelp, onConfirm }: Props) {
  const [drafts, setDrafts] = useState<Record<string,string>>({});
  function submitField(table: string) {
    const raw = (drafts[table]??"").trim(); if(!raw) return;
    const parts = raw.split(/\s+/);
    onAddField(table, parts[0], parts[1]??"text", parts.slice(2).join(" "));
    setDrafts(d=>({...d,[table]:""}));
  }
  return (
    <div className="mt-2.5 bg-vellum border border-vellum-border rounded-lg overflow-hidden">
      {Object.entries(tables).map(([name,fields])=>(
        <div key={name}>
          <div className="px-3 py-1.5 bg-[#f3f1eb] border-b border-vellum-border text-[11px] font-medium text-ink-muted uppercase tracking-wide">{name}</div>
          <table className="w-full border-collapse">
            <thead><tr>
              <th className="px-2.5 py-1.5 text-[11px] font-medium text-ink-muted text-left border-b border-vellum-border bg-vellum">Field</th>
              <th className="px-2.5 py-1.5 text-[11px] font-medium text-ink-muted text-left border-b border-vellum-border bg-vellum">Type</th>
              <th className="px-2.5 py-1.5 text-[11px] font-medium text-ink-muted text-left border-b border-vellum-border bg-vellum">Note</th>
            </tr></thead>
            <tbody>
              {fields.map((f,i)=>(
                <tr key={i}>
                  <td className="px-2.5 py-1.5 text-[11px] border-b border-vellum-border-light"><strong className="font-medium text-ink">{f.field}</strong></td>
                  <td className="px-2.5 py-1.5 text-[11px] border-b border-vellum-border-light font-mono text-terracotta">{f.type}</td>
                  <td className="px-2.5 py-1.5 text-[11px] border-b border-vellum-border-light text-ink-faint">{f.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {interactive && (
            <div className="flex gap-1.5 items-center p-2 border-t border-vellum-border">
              <input type="text" value={drafts[name]??""} onChange={e=>setDrafts(d=>({...d,[name]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&submitField(name)} placeholder="Add a field (e.g. avatar_url text)" className="flex-1 px-2.5 py-1.5 border border-ink/15 rounded-md text-xs bg-white text-ink"/>
              <button type="button" onClick={()=>submitField(name)} className="px-2.5 py-1.5 rounded-md bg-white border border-vellum-border text-xs font-medium text-ink-secondary hover:bg-vellum-border-light">+ Add</button>
            </div>
          )}
        </div>
      ))}
      {interactive && (
        <div className="flex gap-2 p-3 border-t border-vellum-border">
          <button type="button" onClick={onHelp} className="flex-1 py-1.5 rounded-lg bg-vellum border border-vellum-border text-xs font-medium text-ink-secondary">I need help understanding this</button>
          <button type="button" onClick={onConfirm} className="flex-1 py-1.5 rounded-lg bg-ink text-vellum text-xs font-medium">Looks good →</button>
        </div>
      )}
    </div>
  );
}
