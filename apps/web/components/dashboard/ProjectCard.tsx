"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";
import { PROJECT_TYPE_LABELS } from "@/lib/types";

interface Props {
  project: Project;
  onDelete: (id: string) => void;
  onDownload: (project: Project) => void;
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg px-3 py-1.5 text-left text-[14px] text-ink-secondary hover:bg-hover-veil"
    >
      {label}
    </button>
  );
}

export function ProjectCard({ project, onDelete, onDownload }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const isDone = project.status === "complete";
  const pct = Math.round((project.domainsCompleted / 10) * 100);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  return (
    <div
      ref={ref}
      className="relative overflow-visible rounded-lg border border-hairline bg-white transition-colors hover:bg-sidebar-mist"
    >
      <button
        type="button"
        onClick={() => router.push(`/project/${project.id}/interview`)}
        className="block w-full cursor-pointer overflow-hidden rounded-lg text-left"
      >
        <div className="border-b border-hairline p-4 pb-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="bg-sidebar-mist px-2 py-0.5 text-[10px] font-medium text-ink">
              {PROJECT_TYPE_LABELS[project.type]}
            </span>
            <span className="w-[30px]" aria-hidden="true" />
          </div>
          <div className="font-serif-heading mb-1 text-[15px] leading-tight text-ink">{project.name}</div>
          <div className="line-clamp-2 text-xs leading-snug text-ink-muted">{project.description}</div>
        </div>
        <div className="flex items-center justify-between bg-sidebar-mist px-4 py-3">
          <div className="mr-2.5 flex flex-1 items-center gap-2">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ink" />
            <div className="h-[3px] max-w-[80px] flex-1 rounded-full bg-edge-gray">
              <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
            </div>
            <span className="whitespace-nowrap text-[11px] text-ink-faint">
              {isDone ? "Complete" : `${project.domainsCompleted}/10`}
            </span>
          </div>
          <span className="whitespace-nowrap text-[11px] text-ink-faint">{project.updatedAt}</span>
        </div>
      </button>

      <div className="absolute right-4 top-4 z-50">
        <button
          type="button"
          aria-label="Project actions"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(value => !value)}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-hairline bg-white text-[16px] leading-none text-ink hover:bg-hover-veil"
        >
          ...
        </button>
        {menuOpen && (
          <div className="absolute left-[calc(100%+8px)] top-0 z-50 min-w-[164px] rounded-lg border border-hairline bg-white p-1">
            <MenuItem label={isDone ? "View document" : "Continue interview"} onClick={() => router.push(`/project/${project.id}/interview`)} />
            <MenuItem label="Rename" onClick={() => setMenuOpen(false)} />
            <MenuItem label="Download .md" onClick={() => { onDownload(project); setMenuOpen(false); }} />
            <MenuItem label="Delete" onClick={() => { onDelete(project.id); setMenuOpen(false); }} />
          </div>
        )}
      </div>
    </div>
  );
}
