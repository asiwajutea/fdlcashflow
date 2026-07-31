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

const A4_W    = 794;  // px — A4 at 96 dpi
const MARGIN_H = 72;  // left & right padding inside the page
const MARGIN_V = 52;  // top & bottom padding

/**
 * ScaledPage
 *
 * Layout strategy that guarantees no text clipping:
 *
 * 1. The "page" div is always exactly A4_W (794 px) wide in the DOM.
 *    The browser therefore lays out all text at the correct A4 line length —
 *    words wrap naturally, nothing is cut.
 *
 * 2. We measure the available container width with a ResizeObserver and
 *    compute scale = containerWidth / 794.
 *
 * 3. We apply  transform: scale(s) + transformOrigin: "top left"  on the
 *    page div, which shrinks it visually without affecting layout.
 *
 * 4. The OUTER wrapper gets  width = 794 * scale  and  height = pageH * scale
 *    so it occupies exactly the right space in the scroll container — no
 *    overflow, no clipping, correct scroll height.
 *
 *    This is the key difference from previous versions: the outer div must
 *    match the SCALED dimensions, not the unscaled ones.
 */
function ScaledPage({
  headerHtml,
  bodyHtml,
  footerHtml,
  captureId,
}: {
  headerHtml: string;
  bodyHtml:   string;
  footerHtml: string;
  captureId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null); // measures available width
  const pageRef      = useRef<HTMLDivElement>(null); // the 794-px A4 content div

  const [scale, setScale]     = useState(1);
  const [pageH, setPageH]     = useState(1123); // natural (unscaled) height

  // ── 1. Track container width → compute scale ─────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth;          // use offsetWidth (excludes padding/border)
      if (w > 0) setScale(Math.min(1, w / A4_W));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── 2. Track page natural height ─────────────────────────────────────────
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const update = () => setPageH(el.scrollHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [headerHtml, bodyHtml, footerHtml]);

  // Scaled dimensions for the outer wrapper
  const scaledW = Math.round(A4_W  * scale);
  const scaledH = Math.round(pageH * scale);

  return (
    // Invisible measuring div — full available width, zero height
    <div ref={containerRef} style={{ width: '100%', height: 0, overflow: 'visible' }}>
      {/*
        Outer wrapper: exactly the scaled size.
        NO overflow:hidden — that is what was clipping the content.
      */}
      <div style={{ width: scaledW, height: scaledH, position: 'relative' }}>
        {/*
          Inner page: always 794 px wide, transformed to scale.
          position:absolute + top/left:0 so it sits inside the wrapper.
        */}
        <div
          ref={pageRef}
          id={captureId}
          style={{
            position:        'absolute',
            top:             0,
            left:            0,
            width:           A4_W,
            background:      '#ffffff',
            transformOrigin: 'top left',
            transform:       `scale(${scale})`,
            // typography defaults — editor content inherits these
            fontFamily:  '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
            fontSize:    13.5,
            lineHeight:  1.65,
            color:       '#111111',
            // word-wrap defaults on the container; the <style> below overrides
            // any inline styles the rich-text editor injected
            wordBreak:    'normal',
            overflowWrap: 'normal',
          }}
        >
          {/* ── Header ── */}
          {headerHtml && (
            <div
              style={{
                padding:      `36px ${MARGIN_H}px 20px`,
                borderBottom: '1px solid #e2e8f0',
              }}
              dangerouslySetInnerHTML={{ __html: sanitize(headerHtml) }}
            />
          )}

          {/* ── Body ── */}
          <div
            className="ct-body"
            style={{ padding: `${MARGIN_V}px ${MARGIN_H}px` }}
            dangerouslySetInnerHTML={{ __html: sanitize(bodyHtml) }}
          />

          {/* ── Footer ── */}
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

      {/* Global style — !important beats any inline styles from the editor */}
      <style>{`
        .ct-body, .ct-body * {
          word-break:      normal  !important;
          overflow-wrap:   normal  !important;
          hyphens:         none    !important;
          -webkit-hyphens: none    !important;
          white-space:     normal  !important;
        }
        .ct-body p            { margin-bottom: 0.8em; }
        .ct-body h1           { font-size: 20px; font-weight: 700; margin: 1.1em 0 0.4em; }
        .ct-body h2           { font-size: 16px; font-weight: 700; margin: 1em 0 0.4em; }
        .ct-body h3           { font-size: 14px; font-weight: 700; margin: 0.9em 0 0.35em; }
        .ct-body h4, .ct-body h5 { font-size: 13.5px; font-weight: 700; margin: 0.8em 0 0.3em; }
        .ct-body ul, .ct-body ol { margin: 0.5em 0 0.85em 1.5em; }
        .ct-body li           { margin-bottom: 0.3em; }
        .ct-body table        { width: 100%; border-collapse: collapse; margin-bottom: 1em; font-size: 12.5px; }
        .ct-body td, .ct-body th { border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: top; }
        .ct-body th           { font-weight: 700; background: #f8fafc; }
        .ct-body img          { max-width: 100%; height: auto; }
        .ct-body a            { color: #2563eb; text-decoration: underline; }
        .ct-body hr           { border: none; border-top: 1px solid #e2e8f0; margin: 1em 0; }
        .ct-body blockquote   { border-left: 3px solid #cbd5e1; padding: 8px 16px; color: #475569; margin: 1em 0; }
      `}</style>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
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
        style={{ border: '1px solid #e2e8f0', borderRadius: 3 }}
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

  // inline / print — no scaling, fixed A4 width
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
