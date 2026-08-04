import { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface ContractRendererProps {
  headerHtml?: string;
  bodyHtml?:   string;
  footerHtml?: string;
  className?:  string;
  captureId?:  string;
  /** Set false to render as one continuous sheet (no A4 pagination). */
  paginate?:   boolean;
  /** Page margins in px. Defaults: top 56, bottom 56, left 64, right 64 */
  margins?: { top?: number; bottom?: number; left?: number; right?: number };
}

/**
 * Normalise HTML pasted in from Word / Google Docs / other editors.
 * Pasted markup often carries fixed pixel widths, floats, absolute positioning
 * or nowrap rules that push text outside the A4 content column (making the
 * sentence look "cut off" at the right edge). We strip those declarations while
 * keeping visual formatting (bold, colour, alignment, font-size).
 */
const BAD_STYLE_PROPS = [
  'width', 'min-width', 'max-width', 'height', 'min-height',
  'position', 'left', 'right', 'top', 'bottom', 'float', 'clear',
  'white-space', 'word-break', 'overflow-wrap', 'word-wrap',
  'text-indent', 'transform', 'zoom', 'overflow', 'overflow-x',
  'margin-left', 'margin-right', 'padding-left', 'padding-right',
  'letter-spacing', 'hyphens',
];

function normalizePastedHtml(html: string): string {
  if (typeof document === 'undefined' || !html) return html || '';
  const root = document.createElement('div');
  root.innerHTML = html;

  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    // Drop legacy width/height attributes (Word tables, images, etc.)
    if (el.tagName !== 'IMG') {
      el.removeAttribute('width');
      el.removeAttribute('height');
    } else {
      el.removeAttribute('width');
      el.removeAttribute('height');
    }
    el.removeAttribute('align');

    const style = el.getAttribute('style');
    if (style) {
      const kept = style
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean)
        .filter((d) => {
          const prop = d.split(':')[0]?.trim().toLowerCase();
          return prop && !BAD_STYLE_PROPS.includes(prop);
        });
      if (kept.length) el.setAttribute('style', kept.join('; '));
      else el.removeAttribute('style');
    }
  });

  return root.innerHTML;
}

const sanitize = (html: string) =>
  normalizePastedHtml(
    DOMPurify.sanitize(html || '', { ADD_ATTR: ['target', 'rel', 'style'] }),
  );

/* ── A4 geometry @96dpi ─────────────────────────────────────── */
export const A4_W = 794;   // px
export const A4_H = 1123;  // px
const PAD_X = 64;
const PAD_TOP = 56;
const PAD_BOTTOM = 56;
const FOOTER_H = 58;       // reserved strip at the bottom of every page

const CONTENT_W = A4_W - PAD_X * 2;

const CT_STYLES = `
  .ct-sheet {
    background: #ffffff;
    color: #111111;
    font-family: "Times New Roman", Georgia, serif;
    font-size: 14.5px;
    line-height: 1.7;
    /* Never split real words; only break tokens that cannot fit on a line. */
    word-break: normal;
    overflow-wrap: break-word;
    word-wrap: break-word;
    hyphens: none;
    -webkit-hyphens: none;
    -ms-hyphens: none;
  }
  .ct-sheet *, .ct-measure * {
    word-break: normal !important;
    overflow-wrap: break-word !important;
    word-wrap: break-word !important;
    hyphens: none !important;
    -webkit-hyphens: none !important;
    -ms-hyphens: none !important;
    white-space: normal !important;
    max-width: 100% !important;
    letter-spacing: normal !important;
    float: none !important;
    position: static !important;
  }
  .ct-body, .ct-header, .ct-footer { width: 100%; box-sizing: border-box; }
  .ct-body > * { max-width: 100% !important; }
  .ct-body p              { margin: 0 0 0.75em; text-align: left; }
  .ct-body h1             { font-size: 21px; font-weight: 700; margin: 1.1em 0 0.45em; color: #0B1F3B; }
  .ct-body h2             { font-size: 17.5px; font-weight: 700; margin: 1em 0 0.4em; color: #0B1F3B; }
  .ct-body h3             { font-size: 15.5px; font-weight: 700; margin: 0.9em 0 0.35em; color: #0B1F3B; }
  .ct-body h4, .ct-body h5 { font-size: 14.5px; font-weight: 700; margin: 0.8em 0 0.3em; }
  .ct-body ul, .ct-body ol { margin: 0.4em 0 0.85em 1.5em; padding-left: 0.4em; }
  .ct-body li             { margin-bottom: 0.28em; }
  .ct-body table          { width: 100%; border-collapse: collapse; margin-bottom: 1em; table-layout: fixed; }
  .ct-body td, .ct-body th { border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: top; }
  .ct-body th             { font-weight: 700; background: #f8fafc; }
  .ct-body img            { max-width: 100%; height: auto; }
  .ct-body a              { color: #2563eb; text-decoration: underline; }
  .ct-body hr             { border: none; border-top: 1px solid #e2e8f0; margin: 1em 0; }
  .ct-body blockquote     { border-left: 3px solid #cbd5e1; padding: 8px 16px; color: #475569; margin: 1em 0; }
  .ct-header img          { max-width: 100%; height: auto; }
  .ct-measure {
    position: absolute; left: -10000px; top: 0; visibility: hidden;
    pointer-events: none;
  }
`;

/** Split sanitized body HTML into page-sized chunks by measuring block elements. */
function paginateHtml(html: string, firstPageBudget: number, pageBudget: number, contentW = CONTENT_W): string[] {
  if (typeof document === 'undefined') return [html];

  const measure = document.createElement('div');
  measure.className = 'ct-measure ct-sheet';
  measure.style.width = `${contentW}px`;
  const inner = document.createElement('div');
  inner.className = 'ct-body';
  inner.style.width = `${contentW}px`;
  inner.innerHTML = html;
  measure.appendChild(inner);
  document.body.appendChild(measure);

  const blocks = Array.from(inner.children) as HTMLElement[];
  const pages: string[] = [];
  let current: string[] = [];
  let used = 0;
  let budget = firstPageBudget;

  const flush = () => {
    if (current.length) pages.push(current.join(''));
    current = [];
    used = 0;
    budget = pageBudget;
  };

  for (const el of blocks) {
    const style = window.getComputedStyle(el);
    const h = el.offsetHeight + parseFloat(style.marginTop || '0') + parseFloat(style.marginBottom || '0');
    if (h > budget && current.length === 0) {
      // Block taller than a whole page — keep it alone, it will flow long.
      pages.push(el.outerHTML);
      budget = pageBudget;
      continue;
    }
    if (used + h > budget && current.length) flush();
    current.push(el.outerHTML);
    used += h;
  }
  flush();

  document.body.removeChild(measure);
  return pages.length ? pages : [html];
}

export function ContractRenderer({
  headerHtml = '',
  bodyHtml   = '',
  footerHtml = '',
  className,
  captureId,
  paginate = true,
  margins: marginsProp,
}: ContractRendererProps) {
  // Resolve effective margins — prop values override defaults
  const padTop    = marginsProp?.top    ?? PAD_TOP;
  const padBottom = marginsProp?.bottom ?? PAD_BOTTOM;
  const padLeft   = marginsProp?.left   ?? PAD_X;
  const padRight  = marginsProp?.right  ?? PAD_X;
  const contentW  = A4_W - padLeft - padRight;

  const cleanHeader = useMemo(() => sanitize(headerHtml), [headerHtml]);
  const cleanBody   = useMemo(() => sanitize(bodyHtml),   [bodyHtml]);
  const cleanFooter = useMemo(() => sanitize(footerHtml), [footerHtml]);

  const [pages, setPages] = useState<string[]>([cleanBody]);
  const headerRef = useRef<HTMLDivElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const docRef    = useRef<HTMLDivElement>(null);
  const [scale, setScale]   = useState(1);
  const [wrapH, setWrapH]   = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!paginate) { setPages([cleanBody]); return; }
    const t = window.setTimeout(() => {
      const headerH = cleanHeader ? (headerRef.current?.offsetHeight ?? 0) : 0;
      const usable  = A4_H - padTop - padBottom - FOOTER_H;
      setPages(paginateHtml(cleanBody, Math.max(200, usable - headerH), usable, contentW));
    }, 60);
    return () => window.clearTimeout(t);
  }, [cleanBody, cleanHeader, paginate, padTop, padBottom, contentW]);

  // Shrink-to-fit: the sheet is always a true A4 (794px) but is visually scaled
  // down when the available container is narrower, so nothing spills sideways.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const recalc = () => {
      const avail = el.clientWidth;
      const s = avail > 0 ? Math.min(1, avail / A4_W) : 1;
      setScale(s);
      const h = docRef.current?.offsetHeight ?? 0;
      setWrapH(h ? h * s : undefined);
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    if (docRef.current) ro.observe(docRef.current);
    return () => ro.disconnect();
  }, [pages, cleanHeader, cleanFooter]);

  const total = pages.length;

  return (
    <>
      <style>{CT_STYLES}</style>

      {/* Hidden header used to measure its height for page-1 budget */}
      {cleanHeader && (
        <div className="ct-measure ct-sheet" style={{ width: contentW }} aria-hidden>
          <div ref={headerRef} className="ct-header" dangerouslySetInnerHTML={{ __html: cleanHeader }} />
        </div>
      )}

      <div ref={wrapRef} className="w-full" style={{ height: wrapH, overflow: 'hidden' }}>
      <div
        ref={docRef}
        id={captureId}
        className={cn('ct-doc flex flex-col items-center gap-6', className)}
        style={{ width: A4_W, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >

        {pages.map((pageHtml, i) => (
          <div
            key={i}
            className="ct-page ct-sheet shadow-md border border-slate-300 relative"
            style={{
              width: A4_W,
              minHeight: paginate ? A4_H : undefined,
              paddingTop:    padTop,
              paddingLeft:   padLeft,
              paddingRight:  padRight,
              paddingBottom: padBottom + FOOTER_H,
              boxSizing: 'border-box',
              maxWidth: '100%',
            }}
          >
            {i === 0 && cleanHeader && (
              <div
                className="ct-header"
                style={{ paddingBottom: 18, marginBottom: 22, borderBottom: '1px solid #e2e8f0' }}
                dangerouslySetInnerHTML={{ __html: cleanHeader }}
              />
            )}

            <div className="ct-body" dangerouslySetInnerHTML={{ __html: pageHtml }} />

            <div
              className="ct-footer"
              style={{
                position: 'absolute',
                left:   padLeft,
                right:  padRight,
                bottom: 22,
                borderTop: '1px solid #e2e8f0',
                paddingTop: 8,
                fontSize: 10.5,
                color: '#64748b',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: 16,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }} dangerouslySetInnerHTML={{ __html: cleanFooter }} />
              <div style={{ whiteSpace: 'nowrap' }}>Page {i + 1} of {total}</div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </>

  );
}

export default ContractRenderer;
