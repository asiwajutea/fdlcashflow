import { useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  compact?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = 260,
  compact = false,
}: RichTextEditorProps) {
  const modules = useMemo(
    () => ({
      toolbar: compact
        ? [['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link', 'clean']]
        : [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ align: [] }],
            ['blockquote', 'link', 'image'],
            ['clean'],
          ],
    }),
    [compact],
  );

  return (
    <div className={cn('bg-card rounded-md border', className)} style={{ ['--rte-min' as any]: `${minHeight}px` }}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        className="rte-editor"
      />
      <style>{`
        .rte-editor .ql-container { min-height: ${minHeight}px; font-family: inherit; font-size: 0.875rem; }
        .rte-editor .ql-toolbar { border-top-left-radius: 0.375rem; border-top-right-radius: 0.375rem; border-color: hsl(var(--border)); }
        .rte-editor .ql-container { border-bottom-left-radius: 0.375rem; border-bottom-right-radius: 0.375rem; border-color: hsl(var(--border)); }
        .rte-editor .ql-editor { min-height: ${minHeight}px; color: hsl(var(--card-foreground)); }
        .rte-editor .ql-editor.ql-blank::before { color: hsl(var(--muted-foreground)); font-style: normal; }
        .rte-editor .ql-snow .ql-stroke { stroke: hsl(var(--card-foreground)); }
        .rte-editor .ql-snow .ql-fill { fill: hsl(var(--card-foreground)); }
        .rte-editor .ql-snow .ql-picker { color: hsl(var(--card-foreground)); }
      `}</style>
    </div>
  );
}

export default RichTextEditor;
