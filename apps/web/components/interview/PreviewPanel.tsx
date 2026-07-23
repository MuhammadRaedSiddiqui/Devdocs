"use client";
import { useInterviewStore, selectFullDocument } from "@/lib/interview/store";
export function PreviewPanel() {
  const store = useInterviewStore();
  function handleDownload() {
    const doc = selectFullDocument(store);
    const blob = new Blob([doc],{type:"text/markdown"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="DOCUMENTATION.md";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }
  return (
    <div className="flex-shrink-0 border-l border-vellum-border bg-vellum flex flex-col overflow-hidden transition-[width,opacity] duration-300" style={{width:store.isComplete?260:0,opacity:store.isComplete?1:0}}>
      {store.isComplete && (
        <>
          <div className="px-4 py-3 border-b border-vellum-border flex items-center justify-between flex-shrink-0">
            <span className="font-serif-heading text-[13px] text-ink">DOCUMENTATION.md</span>
            <button type="button" onClick={handleDownload} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-ink text-vellum text-[11px] font-medium">↓ Download</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3.5 text-xs leading-relaxed text-ink-secondary" dangerouslySetInnerHTML={{__html:mdToHtml(selectFullDocument(store))}}/>
        </>
      )}
    </div>
  );
}
function mdToHtml(text: string) {
  return text
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/^## (.+)$/gm,'<h2 style="font-family:var(--font-lora);font-size:13px;font-weight:400;color:var(--ink);margin:14px 0 5px;padding-bottom:4px;border-bottom:1px solid var(--vellum-border-light)">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g,'<strong style="font-weight:500;color:var(--ink)">$1</strong>')
    .replace(/`([^`]+)`/g,'<code style="font-family:var(--font-mono);font-size:10px;background:#fff;border:1px solid var(--vellum-border);padding:1px 4px;border-radius:3px">$1</code>')
    .replace(/\n/g,"<br/>");
}
