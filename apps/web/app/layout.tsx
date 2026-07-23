// app/layout.tsx
// Root layout — applies to every route in the application.
// Wires the Lora + Inter fonts (self-hosted via next/font, no CDN),
// loads global CSS, and sets the base HTML metadata.
import type { Metadata, Viewport } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { TRPCProvider } from '@/components/providers/trpc-provider';
import { inter, lora } from "@/lib/fonts";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default:  "DevDocs AI — Pre-build planning for developers",
    template: "%s | DevDocs AI",
  },
  description:
    "Interview with AI before you write a line of code. Get a complete 10-file documentation bundle ready for Claude Code, Cursor, and Windsurf.",
  keywords: ["AI", "developer tools", "documentation", "planning", "Next.js", "Claude"],
  authors:  [{ name: "DevDocs AI" }],
  creator:  "DevDocs AI",
  openGraph: {
    type:        "website",
    locale:      "en_US",
    url:         "https://devdocs.ai",
    siteName:    "DevDocs AI",
    title:       "DevDocs AI — Pre-build planning for developers",
    description: "Interview with AI before you write a line of code.",
  },
  twitter: {
    card:    "summary_large_image",
    title:   "DevDocs AI",
    creator: "@devdocsai",
  },
  robots: {
    index:  true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width:        "device-width",
  initialScale: 1,
  themeColor:   "#faf9f5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <TRPCProvider>
        <html
          lang="en"
          // CSS variables for Lora and Inter are injected here so every
          // component can reference `var(--font-lora)` and `var(--font-inter)`.
          // Tailwind's font-serif and font-sans utilities pick these up via
          // the tailwind.config.ts `fontFamily` extension.
          className={`${inter.variable} ${lora.variable}`}
        >
          <body className="font-sans antialiased bg-vellum text-ink">
            {children}
          </body>
        </html>
      </TRPCProvider>
    </ClerkProvider>
  );
}
