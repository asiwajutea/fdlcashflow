import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface ContractRendererProps {
  headerHtml?: string;
  bodyHtml?:   string;
  footerHtml?: string;
  className?:  string;
  captureId?:  string;
}

const sanitize = (html: string) =>
  DOMPurify.sanitize(html || '', { ADD_ATTR: ['target', 'rel', 'style'] });

/**
 * ContractRenderer
 *
 * Renders a contract document that fills its container width.
 * Content never overflows — text wraps at word boundaries (no mid-word splits).
 *
 * The parent is responsible for constraining the width (e.g. max-w-3xl).
 */
export function ContractRenderer({
  headerHtml = '',
  bodyHtml   = '',
  footerHtml = '',
  className,
  captureId,
}: ContractRendererProps) {
  return (
    <>
      {/* Scoped styles injected into the document head — !important beats
          any inline styles the rich-text editor injects on its elements.    */}
      <style>{`
        .ct-wrap {
          background: #ffffff;
          color: #111111;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
          font-size: 13.5px;
          line-height: 1.65;
          /* The only three rules needed to prevent mid-word splits: */
          word-break:    normal;
          overflow-wrap: break-word;
          hyphens:       none;
          -webkit-hyphens: none;
        }
        /* Override editor inline styles on every descendant */
        .ct-body * {
          word-break:      normal      !important;
          overflow-wrap:   break-word  !important;
          hyphens:         none        !important;
          -webkit-hyphens: none        !important;
          white-space:     normal      !important;
          max-width:       100%        !important;
        }
        .ct-body p              { margin-bottom: 0.8em; }
        .ct-body h1             { font-size: 20px; font-weight: 700; margin: 1.1em 0 0.4em; }
        .ct-body h2             { font-size: 16px; font-weight: 700; margin: 1em   0 0.4em; }
        .ct-body h3             { font-size: 14px; font-weight: 700; margin: 0.9em 0 0.35em; }
        .ct-body h4, .ct-body h5 { font-size: 13.5px; font-weight: 700; margin: 0.8em 0 0.3em; }
        .ct-body ul, .ct-body ol { margin: 0.5em 0 0.85em 1.5em; }
        .ct-body li             { margin-bottom: 0.3em; }
        .ct-body table          { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
        .ct-body td, .ct-body th { border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: top; }
        .ct-body th             { font-weight: 700; background: #f8fafc; }
        .ct-body img            { max-width: 100%; height: auto; display: block; }
        .ct-body a              { color: #2563eb; text-decoration: underline; }
        .ct-body hr             { border: none; border-top: 1px solid #e2e8f0; margin: 1em 0; }
        .ct-body blockquote     { border-left: 3px solid #cbd5e1; padding: 8px 16px; color: #475569; margin: 1em 0; }
        .ct-header img          { max-width: 100%; height: auto; }
        .ct-header *            { max-width: 100% !important; }
        .ct-footer *            { max-width: 100% !important; }
      `}</style>

      <div
        id={captureId}
        className={cn(
          'ct-wrap rounded border border-slate-200 shadow-sm overflow-hidden',
          className,
        )}
      >
        {/* Header */}
        {headerHtml && (
          <div
            className="ct-header"
            style={{ padding: '28px 40px 16px', borderBottom: '1px solid #e2e8f0' }}
            dangerouslySetInnerHTML={{ __html: sanitize(headerHtml) }}
          />
        )}

        {/* Body */}
        <div
          className="ct-body"
          style={{ padding: '36px 40px' }}
          dangerouslySetInnerHTML={{ __html: sanitize(bodyHtml) }}
        />

        {/* Footer */}
        {footerHtml && (
          <div
            className="ct-footer"
            style={{
              padding:   '14px 40px 24px',
              borderTop: '1px solid #e2e8f0',
              fontSize:  11,
              color:     '#64748b',
            }}
            dangerouslySetInnerHTML={{ __html: sanitize(footerHtml) }}
          />
        )}
      </div>
    </>
  );
}

export default ContractRenderer;
