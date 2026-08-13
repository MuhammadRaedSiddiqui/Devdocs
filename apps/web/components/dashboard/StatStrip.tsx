import type { Project } from "@/lib/types";
interface Props { projects: Project[]; projectsLimit: number; userName?: string; }
function getGreeting() { const h=new Date().getHours(); return h<12?"Good morning":h<17?"Good afternoon":"Good evening"; }
function getDate() { return new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}); }
export function StatStrip({ projects, projectsLimit, userName="Ahmad" }: Props) {
  const total=projects.length, inProgress=projects.filter(p=>p.status==="in_progress").length, complete=projects.filter(p=>p.status==="complete").length, domains=projects.reduce((a,p)=>a+p.domainsCompleted,0);
  return (
    <div className="mb-7">
      <div className="flex items-baseline justify-between mb-4">
        <div className="font-serif-heading text-[24px] text-ink">{getGreeting()}, {userName}.</div>
        <div className="text-xs text-ink-faint">{getDate()}</div>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {[{value:total,label:"Total projects",delta:`${projectsLimit-total} of ${projectsLimit} free slots left`},
          {value:inProgress,label:"In progress",delta:"Awaiting your input"},
          {value:complete,label:"Complete",delta:"↑ 1 this week"},
          {value:domains,label:"Domains documented",delta:"across all projects"}].map(({value,label,delta})=>(
          <div key={label} className="bg-white border border-hairline rounded-lg p-3.5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-ink"/>
            <div className="font-serif-heading text-[24px] text-ink leading-none mb-1">{value}</div>
            <div className="text-[11px] text-ink-muted">{label}</div>
            <div className="text-[10px] mt-1.5 font-medium text-ink-muted">{delta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
