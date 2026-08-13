"use client";
import ReactMarkdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Components } from "react-markdown";

// Allow tables and inline code; strip scripts, event handlers, and dangerous URLs.
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "table", "thead", "tbody", "tr", "th", "td"],
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className"]],
    th: [["align"]],
    td: [["align"]],
  },
};

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
  table: ({ children }) => <table className="w-full text-xs border border-hairline my-2 border-collapse">{children}</table>,
  th: ({ children }) => <th className="bg-sidebar-mist text-ink text-left px-2 py-1.5 border border-hairline font-medium">{children}</th>,
  td: ({ children }) => <td className="px-2 py-1.5 border border-hairline text-ink-secondary">{children}</td>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 text-ink-secondary text-xs">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 text-ink-secondary text-xs">{children}</ol>,
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
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
  table: ({ children }) => <table className="w-full text-sm border border-hairline my-3 border-collapse">{children}</table>,
  th: ({ children }) => <th className="bg-sidebar-mist text-ink text-left px-3 py-2 border border-hairline font-medium">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 border border-hairline text-ink-secondary">{children}</td>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 text-ink-secondary">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 text-ink-secondary">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
};

export function MarkdownRenderer({ content, size = "md" }: { content: string; size?: "sm" | "md" }) {
  return (
    <ReactMarkdown
      rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
      components={size === "sm" ? smComponents : mdComponents}
    >
      {content}
    </ReactMarkdown>
  );
}
