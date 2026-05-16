import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Sheet as SheetIcon } from 'lucide-react';
import {
  exportFinancePDF,
  exportFinanceExcel,
  getPeriodRange,
  ExportPeriod,
  FinanceExportData,
} from '@/lib/financeExports';

interface Props {
  build: (period: ExportPeriod) => Omit<FinanceExportData, 'period' | 'rangeStart' | 'rangeEnd'>;
}

export function ExportMenu({ build }: Props) {
  const [busy, setBusy] = useState(false);

  const run = (period: ExportPeriod, fmt: 'pdf' | 'excel') => {
    setBusy(true);
    try {
      const range = getPeriodRange(period);
      const base = build(period);
      const data: FinanceExportData = {
        ...base,
        period,
        rangeStart: range.start,
        rangeEnd: range.end,
      };
      if (fmt === 'pdf') exportFinancePDF(data);
      else exportFinanceExcel(data);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Weekly report</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => run('weekly', 'pdf')}>
          <FileText className="h-4 w-4 mr-2" /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run('weekly', 'excel')}>
          <SheetIcon className="h-4 w-4 mr-2" /> Excel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Monthly report</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => run('monthly', 'pdf')}>
          <FileText className="h-4 w-4 mr-2" /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run('monthly', 'excel')}>
          <SheetIcon className="h-4 w-4 mr-2" /> Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
