"use client";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import type { Components } from "react-markdown";

const smComponents: Components = {
  h2: ({ children }) => (
    <h2 className="font-serif-heading text-[13px] text-ink mb-1.5 mt-3 pb-1 border-b border-vellum-border-light">{children}</h2>
  ),
  strong: ({ children }) => <strong className="font-medium text-ink">{children}</strong>,
  code: ({ children }) => (
    <code className="font-mono text-[10px] bg-vellum border border-vellum-border px-1 py-0.5 rounded">{children}</code>
  ),
  p: ({ children }) => <p className="mb-1.5 text-ink-secondary text-xs leading-relaxed">{children}</p>,
  hr: () => <hr className="border-vellum-border-light my-3" />,
};

const mdComponents: Components = {
  h2: ({ children }) => (
    <h2 className="font-serif-heading text-[15px] text-ink mb-2 mt-4 pb-1.5 border-b border-vellum-border-light">{children}</h2>
  ),
  strong: ({ children }) => <strong className="font-medium text-ink">{children}</strong>,
  code: ({ children }) => (
    <code className="font-mono text-[11px] bg-vellum border border-vellum-border px-1 py-0.5 rounded">{children}</code>
  ),
  p: ({ children }) => <p className="mb-2 text-ink-secondary leading-relaxed">{children}</p>,
  hr: () => <hr className="border-vellum-border-light my-4" />,
};

export function MarkdownRenderer({ content, size = "md" }: { content: string; size?: "sm" | "md" }) {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeSanitize]}
      components={size === "sm" ? smComponents : mdComponents}
    >
      {content}
    </ReactMarkdown>
  );
}
