"use client";
import { useEffect, useRef, useState } from "react";
import { useInterviewStore, selectFullDocument } from "@/lib/interview/store";
import { getDomain } from "@/lib/interview/domains";
import { buildProjectZip } from "@/lib/export/buildZip";
import { PROJECT_TYPE_LABELS } from "@/lib/types";
import type { ChatMessage, DomainId, ProjectContext } from "@/lib/types";
import { CARD_CHOICES } from "@/lib/interview/choices";
import { DomainPicker } from "@/components/interview/DomainPicker";
import { ErrorBanner } from "@/components/interview/ErrorBanner";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

function mdLite(t: string) {
  // Minimal streaming markdown: escape HTML then allow **bold** and `code`.
  // Full sanitization via rehype-sanitize is applied to committed messages;
  // this fast path only handles incremental tokens before `onDone`.
  const esc = t
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const html = esc.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\n/g,"<br/>");
  return <span dangerouslySetInnerHTML={{__html:html}}/>;
}
function Avatar({role}:{role:"user"|"assistant"}) {
  return <div className={`w-[26px] h-[26px] rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-medium ${role==="user"?"bg-sidebar-mist text-ink border border-hairline":"bg-ink text-white"}`}>{role==="user"?"U":"AI"}</div>;
}
function Dots() {
  return <div className="flex gap-1 items-center">{[0,150,300].map(d=><span key={d} className="w-1.5 h-1.5 rounded-full bg-ink-faint animate-bounce" style={{animationDelay:`${d}ms`}}/>)}</div>;
}
function ResponseStatus({ streaming }: { streaming: boolean }) {
  return (
    <div className="flex gap-2.5 items-start" aria-live="polite">
      <Avatar role="assistant" />
      <div className="flex items-center gap-2 bg-white border border-hairline rounded-lg px-3.5 py-3 text-[13px] text-ink-muted">
        <Dots />
        <span>{streaming ? "Responding…" : "Thinking…"}</span>
      </div>
    </div>
  );
}
function Chip({text}:{text:string}) {
  return <span className="bg-white border border-vellum-border rounded-md px-2 py-0.5 text-[11px] text-ink-secondary">{text}</span>;
}
function labelFor(domainId: DomainId, choiceId: string) {
  return CARD_CHOICES[domainId]?.find(o=>o.id===choiceId)?.label ?? choiceId;
}

function Bubble({message,context,onConfirmCard}:{message:ChatMessage;context:ProjectContext;onConfirmCard:(id:string)=>void}) {
  const store = useInterviewStore();
  const [zipping, setZipping] = useState(false);
  const isUser = message.role==="user";
  function handleDownload() {
    const doc=selectFullDocument(store); const blob=new Blob([doc],{type:"text/markdown"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="DOCUMENTATION.md"; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }
  async function handleDownloadZip() {
    if (!store.lockedContext) return;
    setZipping(true);
    try {
      const blob = await buildProjectZip(store.lockedContext, store.domainContent);
      const slug = store.projectName.replace(/\s+/g, "-").toLowerCase() || "project";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${slug}-docs.zip`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } finally { setZipping(false); }
  }
  return (
    <div className={`flex gap-2.5 items-start ${isUser?"flex-row-reverse":""}`}>
      <Avatar role={message.role}/>
      <div className={`max-w-[80%] px-3.5 py-2.5 rounded-lg text-sm leading-relaxed border ${isUser?"bg-sidebar-mist text-ink border-hairline":"bg-white text-ink-secondary border-hairline"}`}>
        <MarkdownRenderer content={message.content} size="md" />
        {message.showCards && <DomainPicker domain={message.showCards} context={context} lockedValue={store.lockedChoices[message.showCards]?.[getDomain(message.showCards).requiredChoiceKey??""]??null} onConfirm={onConfirmCard}/>}
        {message.showDownload && (
          <div className="mt-3 flex flex-col gap-1.5">
            <button type="button" onClick={handleDownload} className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-vellum rounded-vellum text-xs font-medium">↓ Download DOCUMENTATION.md</button>
            <button type="button" onClick={handleDownloadZip} disabled={zipping} className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted hover:text-ink disabled:opacity-50">
              {zipping ? <span className="inline-block w-3 h-3 border-2 border-ink-faint border-t-transparent rounded-full animate-spin"/> : null}
              {zipping ? "Packaging..." : "or download as .zip"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatPanel() {
  const store = useInterviewStore();
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{ listRef.current?.scrollTo({top:listRef.current.scrollHeight}); },[store.messages,store.streamingText,store.isThinking]);
  if (!store.lockedContext) return null;
  const ctx = store.lockedContext;
  const domain = getDomain(store.currentDomain);
  function handleSend() { if(!input.trim()) return; store.sendMessage(input); setInput(""); }
  function handleConfirmCard(choiceId: string) { if(!domain.requiredChoiceKey) return; store.lockDomainChoice(domain.id,domain.requiredChoiceKey,choiceId); }
  const disabled = store.isThinking||store.isStreaming;
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-white">
      {/* Context bar */}
      <div className="px-5 py-2 text-xs text-ink-muted border-b border-hairline bg-sidebar-mist flex items-center gap-1.5 flex-wrap flex-shrink-0">
        <span className="text-ink-faint">Context:</span>
        <span className="bg-sidebar-mist text-ink border border-hairline rounded-none px-2 py-0.5 text-[11px]">{PROJECT_TYPE_LABELS[ctx.projectType]}</span>
        <Chip text={ctx.teamSize.replace("_"," ")}/>
        <Chip text={ctx.timeline.replace(/_/g," ")}/>
        <Chip text={ctx.budget}/>
        {store.elaboration&&domain.id!=="planning"&&<Chip text="📝 described"/>}
        {store.lockedChoices[domain.id]&&domain.requiredChoiceKey&&<Chip text={`🔒 ${labelFor(domain.id,store.lockedChoices[domain.id]![domain.requiredChoiceKey!])}`}/>}
      </div>
      {/* Error banner */}
      <ErrorBanner />
      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {store.messages.filter(message => message.content.trim().length > 0).map((m,i)=><Bubble key={i} message={m} context={ctx} onConfirmCard={handleConfirmCard}/>)}
        {(store.isThinking || (store.isStreaming && !store.streamingText)) && <ResponseStatus streaming={store.isStreaming} />}
        {store.isStreaming&&store.streamingText&&(
          <div className="flex gap-2.5 items-start"><Avatar role="assistant"/>
            <div className="bg-white border border-vellum-border rounded-vellum px-3.5 py-2.5 text-sm leading-relaxed text-ink-secondary max-w-[80%]" aria-live="polite">
              {mdLite(store.streamingText)}<span className="inline-block w-[2px] h-3 bg-ink animate-pulse ml-0.5"/>
            </div>
          </div>
        )}
      </div>
      {/* Input */}
      <div className="border-t border-hairline px-5 py-3.5 flex gap-2 items-end flex-shrink-0 bg-white">
        <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==="Enter")handleSend();}} disabled={disabled} rows={1} placeholder={disabled?"AI is responding...":store.isComplete?"Ask a question or request a change...":"Type your answer..."} className="flex-1 px-3.5 py-2.5 border border-hairline rounded-lg text-[14px] bg-white text-ink resize-none min-h-[42px] max-h-[88px] disabled:opacity-45"/>
        <button type="button" onClick={handleSend} disabled={disabled} className="px-4 py-2.5 bg-ink text-white rounded-lg text-[14px] font-medium disabled:opacity-35">Send</button>
      </div>
    </div>
  );
}
