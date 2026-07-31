import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface ContractRendererProps {
  headerHtml?: string;
  bodyHtml?: string;
  footerHtml?: string;
  className?: string;
  captureId?: string;
  mode?: 'scaled' | 'inline';
}

const sanitize = (html: string) =>
  DOMPurify.sanitize(html || '', { ADD_ATTR: ['target', 'rel', 'style'] });

// A4 at 96 dpi
const A4_W = 794;
const MARGIN_H = 72; // each side
const MARGIN_V = 52;

/**
 * ScaledPage renders the contract at exactly A4_W pixels wide, then uses
 * CSS transform:scale() to shrink it to fit the available container width.
 *
 * Because the content div is always laid out at 794px, the browser computes
 * line breaks at the correct A4 line length — words never get clipped or split.
 * The outer wrapper is sized to contentHeight × scale so the scroll container
 * allocates the right amount of space.
 */
function ScaledPage({
  headerHtml,
  bodyHtml,
  footerHtml,
  className,
  captureId,
}: {
  headerHtml: string;
  bodyHtml: string;
  footerHtml: string;
  className?: string;
  captureId?: string;
}) {
  const outerRef  = useRef<HTMLDivElement>(null); // measures available width
  const innerRef  = useRef<HTMLDivElement>(null); // the 794-px A4 div
  const [scale, setScale]   = useState(1);
  const [pageH, setPageH]   = useState(0);

  // Recompute scale when outer container changes width
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const update = () => {
      const w = outer.clientWidth;
      setScale(w > 0 ? Math.min(1, w / A4_W) : 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    return () => ro.disconnect();
  }, []);

  // Measure the inner A4 div's natural height after render / content change
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const measure = () => setPageH(inner.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [headerHtml, bodyHtml, footerHtml]);

  const displayH = pageH > 0 ? pageH * scale : 'auto';

  return (
    // Outer: full container width, reserves the scaled height for scroll
    <div ref={outerRef} className={cn('w-full', className)}>
      <div style={{ width: '100%', height: displayH, position: 'relative' }}>
        {/* Inner: always 794 px wide, scaled down visually */}
        <div
          ref={innerRef}
          id={captureId}
          style={{
            position:        'absolute',
            top:             0,
            left:            0,
            width:           A4_W,
            transformOrigin: 'top left',
            transform:       `scale(${scale})`,
            // ── Typography that matches a real word processor ──
            fontFamily:      '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
            fontSize:        13.5,
            lineHeight:      1.65,
            color:           '#111',
            background:      '#fff',
            // ── Word-wrap: whole words only, no mid-character breaks ──
            wordBreak:       'normal',
            overflowWrap:    'normal',
          }}
        >
          {/* Header */}
          {headerHtml && (
            <div
              style={{
                padding:      `36px ${MARGIN_H}px 20px`,
                borderBottom: '1px solid #e2e8f0',
              }}
              dangerouslySetInnerHTML={{ __html: sanitize(headerHtml) }}
            />
          )}

          {/* Body */}
          <div
            style={{ padding: `${MARGIN_V}px ${MARGIN_H}px` }}
            // Force correct word-wrap on every child — overrides any inline
            // styles the rich-text editor may have injected
            className="contract-body-inner"
            dangerouslySetInnerHTML={{ __html: sanitize(bodyHtml) }}
          />

          {/* Footer */}
          {footerHtml && (
            <div
              style={{
                padding:   `18px ${MARGIN_H}px 28px`,
                borderTop: '1px solid #e2e8f0',
                fontSize:  11,
                color:     '#64748b',
              }}
              dangerouslySetInnerHTML={{ __html: sanitize(footerHtml) }}
            />
          )}
        </div>
      </div>

      {/*
        Inject a <style> tag that overrides word-break on every element inside
        .contract-body-inner, including any inline-styled spans the editor adds.
        !important beats inline styles.
      */}
      <style>{`
        .contract-body-inner,
        .contract-body-inner * {
          word-break:    normal    !important;
          overflow-wrap: normal    !important;
          hyphens:       none      !important;
          -webkit-hyphens: none   !important;
          white-space:   normal   !important;
        }
        .contract-body-inner p     { margin-bottom: 0.8em; }
        .contract-body-inner h1    { font-size: 20px; font-weight: 700; margin: 1.1em 0 0.4em; }
        .contract-body-inner h2    { font-size: 16px; font-weight: 700; margin: 1em 0 0.4em; }
        .contract-body-inner h3    { font-size: 14px; font-weight: 700; margin: 0.9em 0 0.35em; }
        .contract-body-inner ul,
        .contract-body-inner ol    { margin: 0.5em 0 0.85em 1.5em; }
        .contract-body-inner li    { margin-bottom: 0.3em; }
        .contract-body-inner table { width: 100%; border-collapse: collapse; margin-bottom: 1em; font-size: 12.5px; }
        .contract-body-inner td,
        .contract-body-inner th    { border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: top; }
        .contract-body-inner th    { font-weight: 700; background: #f8fafc; }
        .contract-body-inner img   { max-width: 100%; height: auto; }
        .contract-body-inner a     { color: #2563eb; text-decoration: underline; }
        .contract-body-inner hr    { border: none; border-top: 1px solid #e2e8f0; margin: 1em 0; }
        .contract-body-inner blockquote {
          border-left: 3px solid #cbd5e1;
          padding: 8px 16px;
          color: #475569;
          margin: 1em 0;
        }
      `}</style>
    </div>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────
export function ContractRenderer({
  headerHtml = '',
  bodyHtml   = '',
  footerHtml = '',
  className,
  captureId,
  mode = 'scaled',
}: ContractRendererProps) {
  if (mode === 'scaled') {
    return (
      <div
        className={cn('bg-white shadow-md', className)}
        style={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}
      >
        <ScaledPage
          headerHtml={headerHtml}
          bodyHtml={bodyHtml}
          footerHtml={footerHtml}
          captureId={captureId}
        />
      </div>
    );
  }

  // inline / print mode — no scaling, full A4 width
  return (
    <div
      id={captureId}
      className={cn('bg-white text-neutral-900', className)}
      style={{ width: A4_W, fontFamily: 'Arial, sans-serif', fontSize: 13, wordBreak: 'normal', overflowWrap: 'normal' }}
    >
      {headerHtml && (
        <div
          style={{ padding: `36px ${MARGIN_H}px 20px`, borderBottom: '1px solid #e2e8f0' }}
          dangerouslySetInnerHTML={{ __html: sanitize(headerHtml) }}
        />
      )}
      <div
        style={{ padding: `${MARGIN_V}px ${MARGIN_H}px` }}
        dangerouslySetInnerHTML={{ __html: sanitize(bodyHtml) }}
      />
      {footerHtml && (
        <div
          style={{ padding: `18px ${MARGIN_H}px 28px`, borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#64748b' }}
          dangerouslySetInnerHTML={{ __html: sanitize(footerHtml) }}
        />
      )}
    </div>
  );
}

export default ContractRenderer;
