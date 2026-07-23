"use client";
import { cn } from "@/lib/utils";
import type { ChoiceOption, DomainId, ProjectContext } from "@/lib/types";
import { getRecommendation } from "@/lib/interview/choices";

interface ChoiceCardProps { domain: DomainId; option: ChoiceOption; selected: boolean; context: ProjectContext; onSelect: (id:string)=>void; }
export function ChoiceCard({ domain, option, selected, context, onSelect }: ChoiceCardProps) {
  const { recommended, warning } = getRecommendation(domain, option.id, context);
  return (
    <div role="radio" aria-checked={selected} tabIndex={0} onClick={()=>onSelect(option.id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(option.id);}}} className={cn("bg-vellum border rounded-vellum p-3.5 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-terracotta outline-none",selected?"border-ink border-[1.5px] bg-white":"border-vellum-border hover:border-ink-secondary")}>
      <div className="flex justify-between items-start mb-1">
        <span className="text-[13px] font-medium text-ink">{option.label}</span>
        {recommended && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium badge-green whitespace-nowrap ml-2">Recommended</span>}
        {!recommended && warning && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium badge-amber whitespace-nowrap ml-2">Complex</span>}
      </div>
      <div className="text-xs text-ink-muted leading-snug">{option.description}</div>
      {warning && <div className="text-[11px] text-[#854F0B] mt-1.5">{warning}</div>}
    </div>
  );
}
