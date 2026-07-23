// components/settings/SettingsSidebar.tsx
"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
export type SettingsSection = "account"|"apikey"|"plan"|"privacy";
interface Props { active: SettingsSection; onChange: (s:SettingsSection)=>void; apiKeyConnected: boolean; }
const SECTIONS = [{id:"account"as const,label:"Account"},{id:"apikey"as const,label:"API Key"},{id:"plan"as const,label:"Plan & Billing"},{id:"privacy"as const,label:"Privacy & Data"}];
export function SettingsSidebar({active,onChange,apiKeyConnected}:Props) {
  return (
    <aside className="w-[220px] flex-shrink-0 border-r border-vellum-border bg-vellum flex flex-col py-[18px] overflow-y-auto">
      <Link href="/dashboard" className="flex items-center gap-1.5 px-4 mb-[18px] text-xs text-ink-muted hover:text-ink">← Back to projects</Link>
      <div className="px-4 mb-2 text-[10px] font-medium uppercase tracking-wider text-ink-faint">Settings</div>
      <nav className="px-2">
        {SECTIONS.map(s=>(
          <button key={s.id} type="button" onClick={()=>onChange(s.id)} className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] mb-0.5 transition-colors text-left",active===s.id?"bg-[#fff2ec] text-ink font-medium":"text-ink-muted hover:bg-vellum-border-light hover:text-ink")}>
            {s.label}
            {s.id==="apikey"&&<span className="w-1.5 h-1.5 rounded-full ml-auto flex-shrink-0" style={{background:apiKeyConnected?"#1D9E75":"#c0392b"}}/>}
          </button>
        ))}
      </nav>
    </aside>
  );
}
