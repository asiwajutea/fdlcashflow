import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface ContractRendererProps {
  headerHtml?: string;
  bodyHtml?: string;
  footerHtml?: string;
  className?: string;
  /** id used by html2canvas/print capture — only applies to inline mode */
  captureId?: string;
  /**
   * 'iframe'  — isolated iframe, scales to fit container (default — best for preview)
   * 'inline'  — plain div, used for PDF capture / print
   */
  mode?: 'iframe' | 'inline';
}

// Sanitise but keep layout-relevant attributes; strip word-break/hyphens inline styles
const sanitize = (html: string) =>
  DOMPurify.sanitize(html || '', {
    ADD_ATTR: ['target', 'rel', 'style'],
    // Force-strip any inline word-break or hyphens that the editor may have injected
    FORBID_ATTR: [],
  });

// ── A4 at 96 dpi ─────────────────────────────────────────────────────────────
const A4_W_PX = 794;
const A4_H_PX = 1123;
const MARGIN_H = 72; // px, left + right margin inside the page (each side)
const MARGIN_V = 56; // px, top + bottom

// ── Build the iframe document ─────────────────────────────────────────────────
// Key insight: we set the viewport to exactly A4 width so the browser lays out
// text at the correct line length. `word-break: normal` + `overflow-wrap: normal`
// + `hyphens: none` on EVERYTHING prevents any mid-word breaks.
// The editor's output sometimes wraps content in a div that has inherited
// styles — we override every element unconditionally.
function buildIframeDoc(header: string, body: string, footer: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=${A4_W_PX}"/>
<style>
/* ── Hard reset ────────────────────────────────────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  /* The three lines below are the critical fix.
     word-break:normal  → only break at spaces/hyphens, NEVER mid-character.
     overflow-wrap:normal → don't even break long URLs unless really necessary.
     hyphens:none       → no automatic hyphenation. */
  word-break: normal !important;
  overflow-wrap: normal !important;
  hyphens: none !important;
  -webkit-hyphens: none !important;
}

html {
  width: ${A4_W_PX}px;
  min-width: ${A4_W_PX}px;
}
body {
  width: ${A4_W_PX}px;
  min-width: ${A4_W_PX}px;
  background: #ffffff;
  color: #111111;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  font-size: 13.5px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}

/* ── Page shell ────────────────────────────────────────────────────────────── */
.page {
  width: ${A4_W_PX}px;
  min-height: ${A4_H_PX}px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

/* ── Header ────────────────────────────────────────────────────────────────── */
.contract-header {
  padding: 36px ${MARGIN_H}px 24px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.contract-header img { max-width: 100%; height: auto; display: block; }

/* ── Body ──────────────────────────────────────────────────────────────────── */
.contract-body {
  padding: ${MARGIN_V}px ${MARGIN_H}px;
  flex: 1;
}

/* Typography inside body */
.contract-body p {
  margin-bottom: 0.85em;
}
.contract-body h1 { font-size: 20px; font-weight: 700; margin: 1.1em 0 0.4em; }
.contract-body h2 { font-size: 16px; font-weight: 700; margin: 1em 0 0.4em; }
.contract-body h3 { font-size: 14px; font-weight: 700; margin: 0.9em 0 0.35em; }
.contract-body h4, .contract-body h5 { font-size: 13.5px; font-weight: 700; margin: 0.8em 0 0.3em; }
.contract-body ul, .contract-body ol { margin: 0.5em 0 0.85em 1.6em; }
.contract-body li { margin-bottom: 0.3em; }
.contract-body strong, .contract-body b { font-weight: 700; }
.contract-body em, .contract-body i { font-style: italic; }
.contract-body u { text-decoration: underline; }
.contract-body blockquote {
  border-left: 3px solid #cbd5e1;
  padding: 8px 16px;
  color: #475569;
  margin: 1em 0;
}
.contract-body table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1em;
  font-size: 12.5px;
}
.contract-body td, .contract-body th {
  border: 1px solid #cbd5e1;
  padding: 6px 10px;
  vertical-align: top;
}
.contract-body th { font-weight: 700; background: #f8fafc; }
.contract-body img { max-width: 100%; height: auto; }
.contract-body a { color: #2563eb; text-decoration: underline; }
.contract-body hr { border: none; border-top: 1px solid #e2e8f0; margin: 1em 0; }

/* ── Footer ────────────────────────────────────────────────────────────────── */
.contract-footer {
  padding: 20px ${MARGIN_H}px 32px;
  border-top: 1px solid #e2e8f0;
  font-size: 11px;
  color: #64748b;
  flex-shrink: 0;
}
.contract-footer img { max-width: 100%; height: auto; }
</style>
</head>
<body>
<div class="page">
  ${header ? `<div class="contract-header">${sanitize(header)}</div>` : ''}
  <div class="contract-body">${sanitize(body)}</div>
  ${footer ? `<div class="contract-footer">${sanitize(footer)}</div>` : ''}
</div>
</body>
</html>`;
}

// ── ScaledIframe ──────────────────────────────────────────────────────────────
// The iframe is written at full A4 width so text wraps at the correct line
// length. A CSS transform then scales it down to fit whatever container is
// available — nothing gets clipped and word-wrap is determined by the A4 layout,
// not the screen width.
function ScaledIframe({ html, className }: { html: string; className?: string }) {
  const wrapRef   = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale,        setScale]        = useState(1);
  const [contentHeight, setContentHeight] = useState(A4_H_PX);

  // Re-compute scale whenever the outer container changes size
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      setScale(w > 0 ? Math.min(1, w / A4_W_PX) : 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Inject HTML and measure actual content height after render
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const measure = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        const h = doc.documentElement.scrollHeight;
        setContentHeight(Math.max(h, A4_H_PX));
      } catch { /* cross-origin guard */ }
    };

    // Write synchronously so the load event fires reliably
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }

    // Measure after the next paint (images / fonts may change height)
    iframe.onload = measure;
    const raf = requestAnimationFrame(() => setTimeout(measure, 50));
    return () => cancelAnimationFrame(raf);
  }, [html]);

  const displayHeight = contentHeight * scale;

  return (
    <div ref={wrapRef} className={cn('w-full', className)}>
      {/* Outer div reserves the correct scaled height for the scroll container */}
      <div style={{ position: 'relative', width: '100%', height: displayHeight }}>
        <iframe
          ref={iframeRef}
          title="Contract preview"
          scrolling="no"
          /* width + height as CSS (px), NOT as HTML attributes, so the browser
             respects them properly when combined with transform */
          style={{
            position:        'absolute',
            top:             0,
            left:            0,
            width:           `${A4_W_PX}px`,
            height:          `${contentHeight}px`,
            border:          'none',
            transformOrigin: 'top left',
            transform:       `scale(${scale})`,
            background:      '#ffffff',
            display:         'block',
          }}
        />
      </div>
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
  mode = 'iframe',
}: ContractRendererProps) {

  // ── iframe mode (preview) ────────────────────────────────────────────────
  if (mode === 'iframe') {
    return (
      <div
        className={cn('contract-page-wrapper bg-white shadow-md', className)}
        style={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}
      >
        <ScaledIframe html={buildIframeDoc(headerHtml, bodyHtml, footerHtml)} />
      </div>
    );
  }

  // ── inline mode (PDF capture / print) ───────────────────────────────────
  const looksHtml = /<\w+[\s>]/.test(bodyHtml);
  return (
    <div
      id={captureId}
      className={cn('contract-doc bg-white text-neutral-900', className)}
      style={{
        width: A4_W_PX,
        fontFamily: 'Arial, sans-serif',
        fontSize: 13,
        wordBreak: 'normal',
        overflowWrap: 'normal',
      }}
    >
      {headerHtml && (
        <div
          style={{ padding: `36px ${MARGIN_H}px 24px`, borderBottom: '1px solid #e2e8f0' }}
          dangerouslySetInnerHTML={{ __html: sanitize(headerHtml) }}
        />
      )}
      <div style={{ padding: `${MARGIN_V}px ${MARGIN_H}px` }}>
        {looksHtml
          ? <div dangerouslySetInnerHTML={{ __html: sanitize(bodyHtml) }} />
          : <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.65 }}>{bodyHtml}</div>
        }
      </div>
      {footerHtml && (
        <div
          style={{ padding: `20px ${MARGIN_H}px 32px`, borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#64748b' }}
          dangerouslySetInnerHTML={{ __html: sanitize(footerHtml) }}
        />
      )}
    </div>
  );
}

export default ContractRenderer;
