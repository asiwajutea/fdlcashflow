import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface ContractRendererProps {
  headerHtml?: string;
  bodyHtml?: string;
  footerHtml?: string;
  className?: string;
  /** id used by html2canvas/print capture */
  captureId?: string;
}

const sanitize = (html: string) =>
  DOMPurify.sanitize(html || '', { ADD_ATTR: ['target', 'rel'] });

/**
 * Renders a contract document with an optional branded header and footer wrapping
 * the rich-text body. Used for on-screen preview and PDF export capture.
 */
export function ContractRenderer({
  headerHtml,
  bodyHtml,
  footerHtml,
  className,
  captureId,
}: ContractRendererProps) {
  const looksHtml = /<\w+[\s>]/.test(bodyHtml || '');
  return (
    <div
      id={captureId}
      className={cn(
        'contract-doc bg-white text-neutral-900 mx-auto shadow-sm border rounded-md overflow-hidden',
        className,
      )}
      style={{ maxWidth: '820px', minHeight: '1100px' }}
    >
      {headerHtml && (
        <div
          className="contract-header px-10 pt-8 pb-4 border-b bg-white"
          dangerouslySetInnerHTML={{ __html: sanitize(headerHtml) }}
        />
      )}
      <div className="contract-body px-10 py-8 prose prose-sm max-w-none">
        {looksHtml ? (
          <div dangerouslySetInnerHTML={{ __html: sanitize(bodyHtml || '') }} />
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-6">{bodyHtml}</div>
        )}
      </div>
      {footerHtml && (
        <div
          className="contract-footer px-10 pb-8 pt-4 border-t text-xs text-neutral-600 bg-white"
          dangerouslySetInnerHTML={{ __html: sanitize(footerHtml) }}
        />
      )}
    </div>
  );
}

export default ContractRenderer;
