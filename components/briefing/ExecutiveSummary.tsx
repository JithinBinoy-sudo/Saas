'use client';

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  markdown: string;
};

const RED_DOT = /🔴/;
const GREEN_DOT = /🟢/;

function HeadingWithDot({
  level,
  children,
}: {
  level: 3 | 4;
  children: React.ReactNode;
}) {
  const text = flattenChildren(children);
  const hasRed = RED_DOT.test(text);
  const hasGreen = GREEN_DOT.test(text);
  const cleaned = text.replace(RED_DOT, '').replace(GREEN_DOT, '').replace(/\(\s*\)/g, '').trim();

  const sizeClass =
    level === 3
      ? 'mt-0 mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground'
      : 'mt-0 mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground';

  return (
    <h4 className={sizeClass}>
      {hasRed && (
        <span className="inline-block h-2 w-2 rounded-full bg-destructive" aria-hidden />
      )}
      {hasGreen && (
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
      )}
      {cleaned}
    </h4>
  );
}

function flattenChildren(node: React.ReactNode): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenChildren).join('');
  if (typeof node === 'object' && 'props' in node) {
    return flattenChildren((node as { props: { children?: React.ReactNode } }).props.children);
  }
  return '';
}

const components: Components = {
  h1: ({ children }) => (
    <h3 className="mt-0 mb-3 text-base font-semibold tracking-tight">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mt-0 mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  ),
  h3: ({ children }) => <HeadingWithDot level={3}>{children}</HeadingWithDot>,
  h4: ({ children }) => <HeadingWithDot level={4}>{children}</HeadingWithDot>,
  p: ({ children }) => (
    <p className="mb-2 text-sm leading-relaxed text-foreground last:mb-0">{children}</p>
  ),
  ul: ({ children }) => <ul className="mb-3 space-y-1 text-sm last:mb-0">{children}</ul>,
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm last:mb-0">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm leading-relaxed text-foreground">{children}</li>
  ),
  strong: ({ children }) => <span className="font-semibold">{children}</span>,
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => null,
  table: ({ children }) => (
    <div className="my-3 overflow-hidden rounded-md border border-border">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-1.5 text-left font-medium text-foreground last:text-right">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-1.5 tabular-nums text-foreground last:text-right">{children}</td>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>
  ),
};

export function ExecutiveSummary({ markdown }: Props) {
  return (
    <div className="text-sm leading-relaxed text-foreground md:columns-2 md:gap-10 [&>*]:break-inside-avoid">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
