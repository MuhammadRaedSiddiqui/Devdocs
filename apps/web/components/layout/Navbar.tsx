"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

interface NavbarProps { active?: "projects" | "templates" | "docs"; userEmail?: string; userInitial?: string; }

const LINKS = [
  { id: "projects" as const, label: "Projects", href: "/dashboard" },
  { id: "templates" as const, label: "Templates", href: "/templates" },
  { id: "docs" as const, label: "Docs", href: "/docs" },
];

export function Navbar({ active }: Omit<NavbarProps, 'userEmail' | 'userInitial'>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const { signOut } = useClerk();

  const userEmail = user?.primaryEmailAddress?.emailAddress || "user@devdocs.ai";
  const userInitial = user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || "U";
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false); }
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);
  return (
    <nav className="h-[52px] border-b border-vellum-border bg-vellum flex items-center px-7 gap-6 flex-shrink-0">
      <span className="font-serif-heading text-[17px] text-ink">DevDocs AI</span>
      <div className="flex gap-0.5 ml-3">
        {LINKS.map((l) => (
          <Link key={l.id} href={l.href} className={cn("px-3 py-1.5 text-[13px] rounded-md transition-colors", active === l.id ? "text-ink font-medium bg-vellum-border-light" : "text-ink-muted hover:bg-vellum-border-light hover:text-ink")}>{l.label}</Link>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2.5 relative" ref={ref}>
        <button type="button" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-vellum-border rounded-lg text-xs text-ink-faint bg-white">
          <span>⌘K</span><span>Search projects</span>
        </button>
        <button type="button" aria-label="Account menu" onClick={() => setMenuOpen((v) => !v)} className={cn("w-[30px] h-[30px] rounded-full bg-ink text-vellum flex items-center justify-center text-xs font-medium", menuOpen && "ring-2 ring-terracotta")}>
          {userInitial}
        </button>
        {menuOpen && (
          <div className="absolute top-[42px] right-0 bg-white border border-vellum-border rounded-[10px] p-1.5 min-w-[170px] shadow-lg z-30">
            <div className="px-2.5 py-2 text-xs text-ink-faint border-b border-vellum-border-light mb-1">{userEmail}</div>
            <Link href="/settings" className="block px-2.5 py-2 text-[13px] text-ink-secondary rounded-md hover:bg-vellum">Settings</Link>
            <button type="button" onClick={() => signOut()} className="w-full text-left px-2.5 py-2 text-[13px] text-danger rounded-md hover:bg-danger-bg">Sign out</button>
          </div>
        )}
      </div>
    </nav>
  );
}
