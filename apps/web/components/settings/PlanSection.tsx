// components/settings/PlanSection.tsx
import { PageHeader } from "@/components/settings/AccountSection";
interface Props { projectsUsed:number; projectsLimit:number; }
export function PlanSection({projectsUsed,projectsLimit}:Props) {
  const pct=Math.round(projectsUsed/projectsLimit*100);
  return (
    <div className="max-w-[640px]">
      <PageHeader title="Plan & Billing" sub="You're on the free BYOK plan."/>
      <div className="bg-white border border-vellum-border rounded-vellum mb-4 p-4 flex items-center justify-between">
        <div className="flex-1 mr-4">
          <div className="text-xs text-ink-muted mb-1.5">{projectsUsed} of {projectsLimit} projects used</div>
          <div className="h-1.5 bg-vellum-border rounded-full"><div className="h-full bg-terracotta rounded-full" style={{width:`${pct}%`}}/></div>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full font-medium badge-green whitespace-nowrap">Free plan</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          {current:true,badge:"Current plan",tier:"Free",price:"$0",sub:"forever",desc:"For developers validating the approach.",features:["3 projects","All 10 documentation domains","Bring your own API key","ZIP export"],btnLabel:"Your current plan",btnStyle:"current"},
          {badge:"Coming soon",tier:"Pro",price:"$12",sub:"/month",desc:"For developers who build regularly.",features:["Unlimited projects","Hosted key — no BYOK","Project versioning","PDF export"],btnLabel:"Notify me",btnStyle:"disabled"},
          {badge:"Coming soon",tier:"Team",price:"$35",sub:"/seat/mo",desc:"For small teams building together.",features:["Everything in Pro","Team workspaces","Admin dashboard","Priority support"],btnLabel:"Notify me",btnStyle:"disabled"},
        ].map(p=>(
          <div key={p.tier} className={`bg-white border rounded-vellum p-[18px] relative ${p.current?"border-ink border-[1.5px]":"border-vellum-border"}`}>
            <span className={`absolute -top-[9px] left-4 text-[10px] px-2.5 py-0.5 rounded-lg font-medium ${p.current?"bg-ink text-vellum":"badge-amber"}`}>{p.badge}</span>
            <div className="font-serif-heading text-base text-ink mb-0.5 mt-1.5">{p.tier}</div>
            <div className="text-[22px] font-medium text-ink mb-0.5">{p.price}<span className="text-xs text-ink-faint font-normal">{p.sub}</span></div>
            <div className="text-xs text-ink-muted mb-3.5 leading-snug">{p.desc}</div>
            <ul className="space-y-1 mb-4">
              {p.features.map(f=><li key={f} className="text-xs text-ink-secondary flex gap-1.5"><span className="text-[#3B6D11] font-medium flex-shrink-0">✓</span>{f}</li>)}
            </ul>
            <div className="w-full py-2 rounded-lg text-xs font-medium text-center bg-vellum text-ink-faint border border-vellum-border">{p.btnLabel}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
