'use client';

/**
 * Unified rich-content renderer for question stems, options, explanations, and
 * any place a `content_format` string is stored. Supports:
 *   - text     → plain, whitespace-preserved
 *   - markdown → react-markdown + GFM + syntax-highlighted code
 *   - latex    → KaTeX inline ($…$) + display ($$…$$), rest as text
 *   - code     → a single highlighted code block (codeLanguage)
 * plus an optional list of images (mediaUrls). One component so every surface
 * (quiz, exam, review, preview, discussions, moderation) renders identically.
 *
 * The consuming page must import 'katex/dist/katex.min.css' + a highlight theme
 * once (already done app-wide for the quiz/KT surfaces).
 */
import React from 'react';
import katex from 'katex';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMixedLatex(content: string): string {
  const parts = content.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);
  return parts
    .map((part) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        try { return katex.renderToString(part.slice(2, -2), { throwOnError: false, displayMode: true }); }
        catch { return escapeHtml(part); }
      }
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        try { return katex.renderToString(part.slice(1, -1), { throwOnError: false }); }
        catch { return escapeHtml(part); }
      }
      return escapeHtml(part);
    })
    .join('');
}

interface RichContentProps {
  content?: string | null;
  format?: string;          // text | markdown | latex | code
  mediaUrls?: string[] | null;
  codeLanguage?: string | null;
  className?: string;
}

export default function RichContent({ content, format = 'text', mediaUrls, codeLanguage, className = '' }: RichContentProps) {
  const hasText = !!(content && content.trim());
  const hasMedia = !!(mediaUrls && mediaUrls.length);
  if (!hasText && !hasMedia) return null;

  return (
    <div className={`rich-content min-w-0 break-words ${className}`}>
      {hasText && format === 'latex' && (
        <span dangerouslySetInnerHTML={{ __html: renderMixedLatex(content!) }} />
      )}

      {hasText && format === 'markdown' && (
        <div className="prose prose-invert prose-sm max-w-none overflow-x-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {content!}
          </ReactMarkdown>
        </div>
      )}

      {hasText && format === 'code' && (
        <pre className="overflow-x-auto rounded-lg bg-[var(--color-surface-dim)]/80 border border-white/10 p-3 text-xs">
          <code className={codeLanguage ? `language-${codeLanguage}` : undefined}>{content}</code>
        </pre>
      )}

      {hasText && (format === 'text' || !['latex', 'markdown', 'code'].includes(format)) && (
        <span className="whitespace-pre-wrap">{content}</span>
      )}

      {hasMedia && (
        <div className="mt-3 flex flex-col gap-2">
          {mediaUrls!.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={u} alt="" className="max-w-full rounded-lg border border-white/10" />
          ))}
        </div>
      )}
    </div>
  );
}
