"use client";
import { useState } from "react";
import { PageHeader, Card } from "@/components/settings/AccountSection";
import { useToast } from "@/lib/toast";

export function PrivacySection() {
  const { toast } = useToast();
  const [deleteText, setDeleteText] = useState("");
  function exportData() {
    toast("Preparing your export...");
    setTimeout(()=>{
      const blob = new Blob(["# DevDocs AI — Data Export\n\nAccount: ahmad@devdocs.ai\nProjects exported: 4"],{type:"text/markdown"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download="devdocs-ai-export.md";
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast("Downloaded devdocs-ai-export.md");
    }, 800);
  }
  return (
    <div className="max-w-[640px]">
      <PageHeader title="Privacy & Data" sub="What we collect, and how to export or remove it."/>
      <div className="flex gap-2.5 p-3.5 rounded-lg border border-hairline bg-sidebar-mist mb-4">
        <span className="text-sm flex-shrink-0">◇</span>
        <div className="text-[12.5px] leading-snug text-ink-secondary">We collect the minimum data needed to run DevDocs AI — your email and the projects you create. We don&apos;t track your IP address or use cross-site tracking.</div>
      </div>
      <Card title="Export your data" sub="Download all your projects and generated documentation.">
        <button type="button" onClick={exportData} className="px-4 py-1.5 border border-vellum-border rounded-lg text-xs bg-white text-ink-secondary hover:border-ink hover:text-ink">Download all my data</button>
      </Card>
      <div className="bg-white border border-hairline rounded-lg overflow-hidden">
        <div className="px-5 pt-4 pb-3.5 border-b border-hairline bg-sidebar-mist">
          <div className="font-serif-heading text-[15px] mb-0.5 text-ink">Delete account</div>
          <div className="text-xs leading-snug text-ink-muted">This permanently deletes your account and all projects. This cannot be undone.</div>
        </div>
        <div className="px-5 py-[18px]">
          <div className="text-[11px] text-ink-faint mb-2">Type <strong className="text-ink">DELETE</strong> to confirm.</div>
          <div className="flex gap-2 items-center">
            <input type="text" value={deleteText} onChange={e=>setDeleteText(e.target.value)} placeholder="DELETE" className="px-3 py-2 border border-hairline rounded-lg text-[13px] w-40"/>
            <button type="button" disabled={deleteText!=="DELETE"} onClick={()=>toast("Account deletion would be processed here")} className="px-4 py-2 rounded-lg text-xs font-medium bg-ink text-white disabled:opacity-40 disabled:cursor-not-allowed">Delete my account</button>
          </div>
        </div>
      </div>
    </div>
  );
}
