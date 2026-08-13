"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Budget, ExperienceLevel, ProjectContext, ProjectType, TeamSize, Timeline } from "@/lib/types";
import { PROJECT_TYPE_LABELS } from "@/lib/types";

interface Props { projectType: ProjectType; onSubmit: (ctx: ProjectContext) => void; }

const TYPE_ICONS: Record<ProjectType, string> = { saas:"◈", api:"⟨⟩", internal_tool:"⚙", mobile:"◻", landing_page:"◇", other:"○" };

const FIELDS = [
  { key:"teamSize" as const, label:"Team size", options:[{v:"solo",l:"Just me"},{v:"small",l:"2-3 people"},{v:"medium",l:"4-10 people"},{v:"large",l:"10+ people"}] },
  { key:"timeline" as const, label:"Timeline to launch", options:[{v:"under_1_month",l:"Under 1 month"},{v:"1_3_months",l:"1-3 months"},{v:"3_6_months",l:"3-6 months"},{v:"6_plus_months",l:"6+ months"}] },
  { key:"budget" as const, label:"Infrastructure budget", options:[{v:"bootstrapped",l:"Bootstrapped"},{v:"self_funded",l:"Self-funded"},{v:"funded",l:"Funded"}] },
  { key:"experienceLevel" as const, label:"Your experience level", options:[{v:"beginner",l:"Beginner"},{v:"intermediate",l:"Intermediate"},{v:"experienced",l:"Experienced"}] },
];

export function DiscoveryForm({ projectType, onSubmit }: Props) {
  const [values, setValues] = useState<Partial<Record<string,string>>>({});
  const allSelected = FIELDS.every(f => values[f.key]);
  function handleSubmit() {
    if (!allSelected) return;
    onSubmit({ projectType, teamSize: values.teamSize as TeamSize, timeline: values.timeline as Timeline, budget: values.budget as Budget, experienceLevel: values.experienceLevel as ExperienceLevel });
  }
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 max-w-[768px] mx-auto w-full bg-white">
      <div className="mb-1">
        <h2 className="font-serif-heading text-[24px] text-ink mb-1">A few quick questions</h2>
        <p className="text-[14px] text-ink-muted leading-snug">30 seconds. No typing required. The AI reads all of this before the interview begins.</p>
      </div>
      {/* Project type locked chip — never re-asked */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-sidebar-mist border border-hairline rounded-lg my-4">
        <span className="text-base">{TYPE_ICONS[projectType]}</span>
        <div>
          <div className="text-[13px] text-ink font-medium">{PROJECT_TYPE_LABELS[projectType]}</div>
          <div className="text-[11px] text-ink-faint mt-0.5">Selected when you created the project</div>
        </div>
        <span className="ml-auto text-[11px] text-ink-faint">🔒</span>
      </div>
      {FIELDS.map(f => (
        <fieldset key={f.key} className="mb-[18px]">
          <legend className="text-[13px] font-medium text-ink mb-2">{f.label}</legend>
          <div className="flex flex-wrap gap-1.5">
            {f.options.map(o => (
              <button key={o.v} type="button" onClick={()=>setValues(p=>({...p,[f.key]:o.v}))} className={cn("px-3.5 py-1.5 rounded-lg border text-[14px] transition-colors",values[f.key]===o.v?"bg-ink text-white border-ink":"bg-white text-ink-secondary border-hairline hover:bg-hover-veil")}>{o.l}</button>
            ))}
          </div>
        </fieldset>
      ))}
      <button type="button" disabled={!allSelected} onClick={handleSubmit} className="w-full py-3 rounded-vellum bg-ink text-vellum text-sm font-medium mt-2.5 disabled:opacity-35 disabled:cursor-not-allowed">Start planning →</button>
    </div>
  );
}
