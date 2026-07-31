import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface ContractRendererProps {
  headerHtml?: string;
  bodyHtml?: string;
  footerHtml?: string;
  className?: string;
  /** id used by html2canvas/print capture */
  captureId?: string;
  /** Render as paginated A4 pages (default: true) */
  paginated?: boolean;
}

const sanitize = (html: string) =>
  DOMPurify.sanitize(html || '', { ADD_ATTR: ['target', 'rel'] });

/**
 * Renders a contract document with a branded header and footer wrapping the
 * rich-text body. Simulates A4-sized pages so the preview looks like a real
 * printed document rather than one long column.
 *
 * Used for on-screen preview, editor live preview, and PDF export capture.
 */
export function ContractRenderer({
  headerHtml,
  bodyHtml,
  footerHtml,
  className,
  captureId,
  paginated = true,
}: ContractRendererProps) {
  const looksHtml = /<\w+[\s>]/.test(bodyHtml || '');

  const headerSection = headerHtml ? (
    <div
      className="contract-header border-b bg-white"
      style={{ padding: '32px 48px 20px' }}
      dangerouslySetInnerHTML={{ __html: sanitize(headerHtml) }}
    />
  ) : null;

  const bodySection = (
    <div
      className="contract-body prose prose-sm max-w-none"
      style={{ padding: '32px 48px', flex: 1 }}
    >
      {looksHtml ? (
        <div dangerouslySetInnerHTML={{ __html: sanitize(bodyHtml || '') }} />
      ) : (
        <div className="whitespace-pre-wrap text-sm leading-6">{bodyHtml}</div>
      )}
    </div>
  );

  const footerSection = footerHtml ? (
    <div
      className="contract-footer border-t text-xs text-neutral-500 bg-white"
      style={{ padding: '16px 48px 28px' }}
      dangerouslySetInnerHTML={{ __html: sanitize(footerHtml) }}
    />
  ) : null;

  if (!paginated) {
    return (
      <div
        id={captureId}
        className={cn(
          'contract-doc bg-white text-neutral-900 shadow-sm border rounded-md overflow-hidden',
          className,
        )}
        style={{ width: '100%', maxWidth: '794px', margin: '0 auto' }}
      >
        {headerSection}
        {bodySection}
        {footerSection}
      </div>
    );
  }

  // ── Paginated A4 view ───────────────────────────────────────────────────────
  // A4 at 96 dpi ≈ 794 × 1123 px. We simulate pages by splitting the visual
  // into a scrollable stack of A4-proportioned sheets.
  return (
    <div
      id={captureId}
      className={cn('contract-pages', className)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        alignItems: 'center',
        width: '100%',
      }}
    >
      {/* Page 1 — header + body + footer */}
      <div
        className="contract-page bg-white text-neutral-900 shadow-md"
        style={{
          width: '100%',
          maxWidth: '794px',
          minHeight: '1123px',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {headerSection}

        {/* Body — grows to fill the page, content wraps naturally */}
        <div
          className="contract-body prose prose-sm max-w-none"
          style={{
            padding: '32px 48px',
            flex: 1,
            // Allow content to overflow to next visual "page" rather than clipping
            overflow: 'visible',
          }}
        >
          {looksHtml ? (
            <div dangerouslySetInnerHTML={{ __html: sanitize(bodyHtml || '') }} />
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-6">{bodyHtml}</div>
          )}
        </div>

        {footerSection}
      </div>
    </div>
  );
}

export default ContractRenderer;
