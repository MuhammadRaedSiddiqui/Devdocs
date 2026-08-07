"use client";
import { useState } from "react";
import { ChoiceCard } from "@/components/interview/ChoiceCard";
import type { DomainId, ProjectContext } from "@/lib/types";
import { CARD_CHOICES } from "@/lib/interview/choices";

interface Props { domain: DomainId; context: ProjectContext; lockedValue: string|null; onConfirm: (id:string)=>void; }

// CRITICAL FIX #2: Validate custom architecture input
// - Reject strings over 60 characters
// - Reject strings that end in '?'
// - Show inline error rather than storing a question as a system value
function validateCustomInput(text: string): { valid: boolean; error?: string } {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { valid: false };
  if (trimmed.length > 60) return { valid: false, error: "Must be 60 characters or less" };
  if (trimmed.endsWith("?")) return { valid: false, error: "Cannot end with a question mark" };
  return { valid: true };
}

export function DomainPicker({ domain, context, lockedValue, onConfirm }: Props) {
  const [pending, setPending] = useState<string|null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const choices = CARD_CHOICES[domain] ?? [];
  const isLocked = lockedValue !== null;
  const selectedId = isLocked ? lockedValue : pending;
  
  function handleCustomConfirm() {
    const validation = validateCustomInput(customText);
    if (!validation.valid) {
      setCustomError(validation.error ?? "Invalid input");
      return;
    }
    setCustomError(null);
    onConfirm(`custom_${customText.trim().slice(0, 40)}`);
  }
  
  return (
    <div className="mt-2.5 bg-vellum border border-vellum-border rounded-lg overflow-hidden">
      <div className="grid grid-cols-2 gap-2 p-3">
        {choices.map(opt => (
          <ChoiceCard key={opt.id} domain={domain} option={opt} selected={selectedId===opt.id} context={context} onSelect={isLocked?()=>{}:(id)=>setPending(id)} />
        ))}
      </div>
      {!isLocked && (
        <div className="px-3 pb-3">
          {!customOpen ? (
            <button type="button" onClick={()=>setCustomOpen(true)} className="text-xs text-ink-muted underline">I need a custom option</button>
          ) : (
            <div className="flex flex-col gap-1.5 mt-1">
              <input 
                type="text" 
                value={customText} 
                onChange={e=>{
                  setCustomText(e.target.value.slice(0,200));
                  setCustomError(null);
                }} 
                placeholder="Describe your custom choice..." 
                className={`flex-1 px-2.5 py-1.5 border rounded-md text-xs bg-white text-ink ${customError ? 'border-red-400' : 'border-ink/15'}`}
              />
              {customError && (
                <span className="text-[10px] text-red-600">{customError}</span>
              )}
              <div className="flex items-center gap-2">
                <button type="button" disabled={!customText.trim()} onClick={handleCustomConfirm} className="px-3 py-1.5 bg-ink text-vellum rounded-md text-xs font-medium disabled:opacity-35">Confirm</button>
                <button type="button" onClick={()=>{setCustomOpen(false); setCustomText(""); setCustomError(null);}} className="text-xs text-ink-muted">Cancel</button>
              </div>
            </div>
          )}
          {pending && (
            <button type="button" onClick={()=>onConfirm(pending)} className="w-full mt-3 py-2 rounded-vellum bg-ink text-vellum text-[13px] font-medium">
              Confirm {choices.find(c=>c.id===pending)?.label} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
