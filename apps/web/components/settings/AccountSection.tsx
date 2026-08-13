"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/toast";

export function PageHeader({title,sub}:{title:string;sub:string}) {
  return <div className="mb-6"><div className="font-serif-heading text-2xl text-ink mb-1">{title}</div><div className="text-[13px] text-ink-muted">{sub}</div></div>;
}
export function Card({title,sub,children,danger}:{title:string;sub?:string;children:React.ReactNode;danger?:boolean}) {
  return (
    <div className={cn("bg-white border rounded-vellum mb-4 overflow-hidden",danger?"border-danger-border":"border-vellum-border")}>
      <div className="px-5 pt-4 pb-3.5 border-b border-hairline bg-sidebar-mist">
        <div className="font-serif-heading text-[15px] mb-0.5 text-ink">{title}</div>
        {sub&&<div className="text-xs leading-snug text-ink-muted">{sub}</div>}
      </div>
      <div className="px-5 py-[18px]">{children}</div>
    </div>
  );
}
export function Field({label,children}:{label:string;children:React.ReactNode}) {
  return <div className="mb-3.5"><label className="block text-[12.5px] font-medium text-ink mb-1.5">{label}</label>{children}</div>;
}

export function AccountSection() {
  const { toast } = useToast();
  const [showPw,setShowPw]=useState(false);
  const [name,setName]=useState("Ahmad");
  return (
    <div className="max-w-[640px]">
      <PageHeader title="Account" sub="Manage your profile and security."/>
      <Card title="Profile" sub="This information is visible only to you.">
        <div className="flex items-center gap-3.5 mb-[18px]">
          <div className="w-14 h-14 rounded-full bg-ink text-white flex items-center justify-center font-serif-heading text-[22px] flex-shrink-0">{name.charAt(0)}</div>
          <div><div className="text-[15px] font-medium text-ink">{name}</div><div className="text-xs text-ink-faint mt-0.5">Member since April 2026</div></div>
        </div>
        <Field label="Display name"><input type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full px-3 py-2.5 border border-ink/15 rounded-lg text-[13px] bg-white text-ink"/></Field>
        <Field label="Email address">
          <div className="flex items-center gap-2">
            <input type="text" disabled value="ahmad@devdocs.ai" className="flex-1 px-3 py-2.5 border border-ink/15 rounded-lg text-[13px] bg-vellum text-ink-muted"/>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium badge-green whitespace-nowrap">Verified</span>
          </div>
          <div className="text-[11px] text-ink-faint mt-1.5">Email is managed by your account provider and can&apos;t be changed here.</div>
        </Field>
        <button type="button" onClick={()=>toast("Display name saved")} className="px-4 py-1.5 bg-ink text-vellum rounded-lg text-xs font-medium mt-1">Save changes</button>
      </Card>
      <Card title="Security" sub="Manage your password and active sessions.">
        {showPw?(
          <>
            <Field label="Current password"><input type="password" placeholder="••••••••" className="w-full px-3 py-2.5 border border-ink/15 rounded-lg text-[13px] bg-white text-ink"/></Field>
            <Field label="New password"><input type="password" placeholder="••••••••" className="w-full px-3 py-2.5 border border-ink/15 rounded-lg text-[13px] bg-white text-ink"/></Field>
            <Field label="Confirm new password"><input type="password" placeholder="••••••••" className="w-full px-3 py-2.5 border border-ink/15 rounded-lg text-[13px] bg-white text-ink"/></Field>
            <div className="flex gap-2">
              <button type="button" onClick={()=>{setShowPw(false);toast("Password updated");}} className="px-4 py-1.5 bg-ink text-vellum rounded-lg text-xs font-medium">Update password</button>
              <button type="button" onClick={()=>setShowPw(false)} className="px-4 py-1.5 border border-vellum-border rounded-lg text-xs bg-white text-ink-secondary">Cancel</button>
            </div>
          </>
        ):(
          <div className="flex gap-2">
            <button type="button" onClick={()=>setShowPw(true)} className="px-4 py-1.5 border border-vellum-border rounded-lg text-xs bg-white text-ink-secondary hover:border-ink">Change password</button>
            <button type="button" onClick={()=>toast("Signed out of all other devices")} className="px-4 py-1.5 border border-vellum-border rounded-lg text-xs bg-white text-ink-secondary hover:border-ink">Sign out everywhere</button>
          </div>
        )}
      </Card>
    </div>
  );
}
