"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";
import { PROJECT_TYPE_LABELS } from "@/lib/types";
import type { LibraryDoc } from "@/lib/docs-library";

interface Props {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  docs: LibraryDoc[];
}

interface SearchResult {
  id: string;
  type: "project" | "document";
  label: string;
  meta: string;
  href: string;
  icon: string;
}

function buildResults(query: string, projects: Project[], docs: LibraryDoc[]): SearchResult[] {
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const p of projects) {
    const searchable = `${p.name} ${p.type} ${PROJECT_TYPE_LABELS[p.type]}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({
        id: `p-${p.id}`,
        type: "project",
        label: p.name,
        meta: PROJECT_TYPE_LABELS[p.type],
        href: `/project/${p.id}/interview`,
        icon: "◈",
      });
    }
  }

  for (const d of docs) {
    const searchable = `${d.project} ${d.file} ${d.domainLabel} ${d.domainId}`.toLowerCase();
    if (searchable.includes(q)) {
      results.push({
        id: d.id,
        type: "document",
        label: d.file,
        meta: `${d.project} · ${d.domainLabel}`,
        href: `/docs?domain=${d.domainId}`,
        icon: "▤",
      });
    }
  }

  return results;
}

export function SearchModal({ open, onClose, projects, docs }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => query.trim() ? buildResults(query.trim(), projects, docs) : [],
    [query, projects, docs]
  );
  const projectResults = results.filter(r => r.type === "project");
  const docResults = results.filter(r => r.type === "document");

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const navigate = useCallback((result: SearchResult) => {
    router.push(result.href);
    onClose();
  }, [router, onClose]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); return; }
      if (e.key === "Enter" && results[selected]) { e.preventDefault(); navigate(results[selected]); }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, results, selected, navigate, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-ink/40 z-50 flex items-start justify-center pt-[15vh]"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white border border-vellum-border rounded-vellum shadow-2xl w-full max-w-[560px] flex flex-col overflow-hidden max-h-[60vh]">
        <div className="px-4 py-3 border-b border-vellum-border flex items-center gap-3">
          <span className="text-ink-faint text-sm">⌘K</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects and documents..."
            className="flex-1 text-[14px] text-ink bg-transparent outline-none placeholder:text-ink-faint"
          />
          <button type="button" onClick={onClose} className="text-[11px] text-ink-faint border border-vellum-border rounded px-1.5 py-0.5">
            esc
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {query.trim() && results.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-ink-faint">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {projectResults.length > 0 && (
            <div className="px-4 pt-3 pb-1">
              <div className="text-[10px] uppercase tracking-wider text-ink-faint mb-2">Projects</div>
              {projectResults.map(r => {
                const idx = results.indexOf(r);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => navigate(r)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${idx === selected ? "bg-vellum" : "hover:bg-vellum"}`}
                  >
                    <span className="text-sm text-ink-muted">{r.icon}</span>
                    <span className="flex-1 text-[13px] text-ink font-medium truncate">{r.label}</span>
                    <span className="text-[11px] text-ink-faint">{r.meta}</span>
                  </button>
                );
              })}
            </div>
          )}

          {docResults.length > 0 && (
            <div className="px-4 pt-3 pb-1">
              <div className="text-[10px] uppercase tracking-wider text-ink-faint mb-2">Documents</div>
              {docResults.map(r => {
                const idx = results.indexOf(r);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => navigate(r)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${idx === selected ? "bg-vellum" : "hover:bg-vellum"}`}
                  >
                    <span className="text-sm text-ink-muted">{r.icon}</span>
                    <span className="flex-1 text-[13px] text-ink truncate">{r.label}</span>
                    <span className="text-[11px] text-ink-faint truncate max-w-[180px]">{r.meta}</span>
                  </button>
                );
              })}
            </div>
          )}

          {!query.trim() && (
            <div className="px-4 py-6 text-center text-[13px] text-ink-faint">
              Start typing to search projects and documents...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
