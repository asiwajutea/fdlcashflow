import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface ContractRendererProps {
  headerHtml?: string;
  bodyHtml?: string;
  footerHtml?: string;
  className?: string;
  /** id used by html2canvas/print capture — only applies to non-iframe mode */
  captureId?: string;
  /**
   * 'iframe'  — isolated iframe, scales to fit container, best for preview (default)
   * 'inline'  — plain div, used for PDF capture / print
   */
  mode?: 'iframe' | 'inline';
}

const sanitize = (html: string) =>
  DOMPurify.sanitize(html || '', { ADD_ATTR: ['target', 'rel', 'style'] });

// ── A4 page dimensions at 96 dpi ─────────────────────────────────────────────
const A4_W = 794;   // px
const A4_H = 1123;  // px
const PAGE_PADDING_H = 64;  // px left+right inside the page
const PAGE_PADDING_V = 48;  // px top+bottom

// ── Build the full HTML document rendered inside the iframe ──────────────────
function buildDocument(headerHtml: string, bodyHtml: string, footerHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  /* Reset */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${A4_W}px; background: #fff; color: #111; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 13px; line-height: 1.6; }

  /* Page shell */
  .page {
    width: ${A4_W}px;
    min-height: ${A4_H}px;
    display: flex;
    flex-direction: column;
    background: #fff;
    page-break-after: always;
  }

  /* Header */
  .contract-header {
    padding: ${PAGE_PADDING_V / 1.5}px ${PAGE_PADDING_H}px ${PAGE_PADDING_V / 2}px;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
  }
  .contract-header img { max-width: 100%; }

  /* Body */
  .contract-body {
    padding: ${PAGE_PADDING_V}px ${PAGE_PADDING_H}px;
    flex: 1;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  .contract-body img { max-width: 100%; height: auto; }
  .contract-body h1, .contract-body h2, .contract-body h3 { margin: 1em 0 0.4em; font-weight: 700; }
  .contract-body h1 { font-size: 18px; }
  .contract-body h2 { font-size: 15px; }
  .contract-body h3 { font-size: 13px; }
  .contract-body p  { margin-bottom: 0.75em; }
  .contract-body ul, .contract-body ol { margin: 0.5em 0 0.75em 1.5em; }
  .contract-body li { margin-bottom: 0.25em; }
  .contract-body table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
  .contract-body td, .contract-body th { border: 1px solid #cbd5e1; padding: 6px 10px; }
  .contract-body strong, .contract-body b { font-weight: 700; }

  /* Footer */
  .contract-footer {
    padding: ${PAGE_PADDING_V / 2}px ${PAGE_PADDING_H}px ${PAGE_PADDING_V / 1.5}px;
    border-top: 1px solid #e2e8f0;
    font-size: 11px;
    color: #64748b;
    flex-shrink: 0;
  }

  /* Print page breaks */
  @media print {
    .page { min-height: 100vh; }
  }
</style>
</head>
<body>
  <div class="page">
    ${headerHtml ? `<div class="contract-header">${sanitize(headerHtml)}</div>` : ''}
    <div class="contract-body">${sanitize(bodyHtml)}</div>
    ${footerHtml ? `<div class="contract-footer">${sanitize(footerHtml)}</div>` : ''}
  </div>
</body>
</html>`;
}

// ── ScaledIframe ─────────────────────────────────────────────────────────────
// Renders the contract at full A4 width (794px) inside an iframe, then CSS-scales
// the iframe down to fit the available container width. This way text never wraps
// differently than it would on a real A4 page and nothing gets clipped.
function ScaledIframe({ html, className }: { html: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [iframeHeight, setIframeHeight] = useState(A4_H);

  // Compute scale whenever container resizes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const compute = () => {
      const availableW = container.clientWidth;
      setScale(availableW > 0 ? Math.min(1, availableW / A4_W) : 1);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Write HTML into the iframe and sync its height to actual content height
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const onLoad = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      // Let content determine its own height
      const h = doc.documentElement.scrollHeight || A4_H;
      setIframeHeight(Math.max(h, A4_H));
    };

    iframe.addEventListener('load', onLoad);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    }
    return () => iframe.removeEventListener('load', onLoad);
  }, [html]);

  // The wrapper div must have explicit height = iframeHeight * scale so that
  // the parent scroll container knows the correct rendered height
  const scaledHeight = iframeHeight * scale;

  return (
    <div ref={containerRef} className={cn('w-full', className)}>
      <div style={{ width: '100%', height: scaledHeight, position: 'relative', overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          title="Contract preview"
          scrolling="no"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: A4_W,
            height: iframeHeight,
            border: 'none',
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
            background: '#fff',
          }}
        />
      </div>
    </div>
  );
}

// ── ContractRenderer (public API) ─────────────────────────────────────────────
export function ContractRenderer({
  headerHtml = '',
  bodyHtml = '',
  footerHtml = '',
  className,
  captureId,
  mode = 'iframe',
}: ContractRendererProps) {

  // ── iframe mode (default — preview) ────────────────────────────────────────
  if (mode === 'iframe') {
    const html = buildDocument(headerHtml, bodyHtml, footerHtml);
    return (
      <div
        className={cn(
          'contract-page-wrapper bg-white shadow-md rounded-sm overflow-hidden',
          className,
        )}
        style={{ border: '1px solid #e2e8f0' }}
      >
        <ScaledIframe html={html} />
      </div>
    );
  }

  // ── inline mode (PDF capture / print) ───────────────────────────────────────
  const looksHtml = /<\w+[\s>]/.test(bodyHtml);
  return (
    <div
      id={captureId}
      className={cn(
        'contract-doc bg-white text-neutral-900',
        className,
      )}
      style={{ width: A4_W, fontFamily: 'sans-serif', fontSize: 13 }}
    >
      {headerHtml && (
        <div
          style={{ padding: '32px 64px 20px', borderBottom: '1px solid #e2e8f0' }}
          dangerouslySetInnerHTML={{ __html: sanitize(headerHtml) }}
        />
      )}
      <div style={{ padding: '48px 64px', flex: 1 }}>
        {looksHtml
          ? <div dangerouslySetInnerHTML={{ __html: sanitize(bodyHtml) }} />
          : <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6 }}>{bodyHtml}</div>}
      </div>
      {footerHtml && (
        <div
          style={{ padding: '16px 64px 28px', borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#64748b' }}
          dangerouslySetInnerHTML={{ __html: sanitize(footerHtml) }}
        />
      )}
    </div>
  );
}

export default ContractRenderer;
