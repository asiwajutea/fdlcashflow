import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n || 0);

export type ExportPeriod = 'weekly' | 'monthly';

export interface FinanceExportData {
  title: string;
  userName: string;
  period: ExportPeriod;
  rangeStart: Date;
  rangeEnd: Date;
  payslips: any[];
  requests: any[];
  budgets: Array<{ budget: any; used: number; remaining: number; pct: number }>;
  summary: {
    salaryPaid: number;
    expensesTotal: number;
    outstandingAdvances: number;
    reimbursedYtd: number;
    net: number;
  };
  categories?: any[];
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const inRange = (d: Date | string, start: Date, end: Date) => {
  const x = new Date(d).getTime();
  return x >= start.getTime() && x <= end.getTime();
};

export const getPeriodRange = (period: ExportPeriod, ref: Date = new Date()) => {
  if (period === 'weekly') {
    return { start: startOfWeek(ref, { weekStartsOn: 1 }), end: endOfWeek(ref, { weekStartsOn: 1 }) };
  }
  return { start: startOfMonth(ref), end: endOfMonth(ref) };
};

const filterData = (data: FinanceExportData) => {
  const payslips = data.payslips.filter((p: any) => {
    const d = new Date(p.year, (p.month || 1) - 1, 1);
    return inRange(d, data.rangeStart, data.rangeEnd);
  });
  const requests = data.requests.filter((r: any) => inRange(r.created_at, data.rangeStart, data.rangeEnd));
  return { payslips, requests };
};

export function exportFinancePDF(data: FinanceExportData) {
  const doc = new jsPDF();
  const { payslips, requests } = filterData(data);
  const rangeLabel = `${format(data.rangeStart, 'PP')} – ${format(data.rangeEnd, 'PP')}`;

  doc.setFontSize(16);
  doc.setTextColor(11, 31, 59);
  doc.text(data.title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`${data.userName} • ${data.period === 'weekly' ? 'Weekly' : 'Monthly'} Report`, 14, 25);
  doc.text(rangeLabel, 14, 30);

  autoTable(doc, {
    startY: 36,
    head: [['Metric', 'Amount']],
    body: [
      ['Total Salary Paid', fmt(data.summary.salaryPaid)],
      ['Total Deductions', fmt(data.summary.expensesTotal)],
      ['Outstanding Advances', fmt(data.summary.outstandingAdvances)],
      ['Reimbursed YTD', fmt(data.summary.reimbursedYtd)],
      ['Net Position', fmt(data.summary.net)],
    ],
    headStyles: { fillColor: [11, 31, 59] },
    theme: 'striped',
  });

  if (payslips.length) {
    autoTable(doc, {
      head: [['Period', 'Slip #', 'Gross', 'Deductions', 'Net']],
      body: payslips.map((p: any) => [
        `${MONTHS[(p.month || 1) - 1]} ${p.year}`,
        p.slip_number || p.invoice_number || '',
        fmt(Number(p.gross_payment || 0)),
        fmt(Number(p.total_deductions || 0)),
        fmt(Number(p.net_payment || 0)),
      ]),
      headStyles: { fillColor: [255, 122, 0] },
      didDrawPage: (d) => {
        doc.setFontSize(11);
        doc.setTextColor(11, 31, 59);
        doc.text('Payslips', 14, d.cursor!.y - 6);
      },
    });
  }

  if (requests.length) {
    autoTable(doc, {
      head: [['Date', 'Type', 'Category', 'Amount', 'Status']],
      body: requests.map((r: any) => [
        format(new Date(r.created_at), 'MMM d, yyyy'),
        r.kind.replace('_', ' '),
        data.categories?.find((c: any) => c.id === r.category_id)?.name || '—',
        fmt(Number(r.amount)),
        r.status,
      ]),
      headStyles: { fillColor: [255, 122, 0] },
      didDrawPage: (d) => {
        doc.setFontSize(11);
        doc.setTextColor(11, 31, 59);
        doc.text('Finance Requests', 14, d.cursor!.y - 6);
      },
    });
  }

  if (data.budgets.length) {
    autoTable(doc, {
      head: [['Kind', 'Scope', 'Limit', 'Used', 'Remaining', '%']],
      body: data.budgets.map((b) => [
        b.budget.kind.replace('_', ' '),
        b.budget.scope_type,
        fmt(Number(b.budget.monthly_limit)),
        fmt(b.used),
        fmt(b.remaining),
        `${b.pct}%`,
      ]),
      headStyles: { fillColor: [255, 122, 0] },
      didDrawPage: (d) => {
        doc.setFontSize(11);
        doc.setTextColor(11, 31, 59);
        doc.text('Budget Usage (this month)', 14, d.cursor!.y - 6);
      },
    });
  }

  doc.save(`finance-${data.period}-${format(data.rangeStart, 'yyyyMMdd')}.pdf`);
}

export function exportFinanceExcel(data: FinanceExportData) {
  const { payslips, requests } = filterData(data);
  const wb = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Finance Report', data.title],
    ['User', data.userName],
    ['Period', data.period],
    ['From', format(data.rangeStart, 'PP')],
    ['To', format(data.rangeEnd, 'PP')],
    [],
    ['Metric', 'Amount (NGN)'],
    ['Total Salary Paid', data.summary.salaryPaid],
    ['Total Deductions', data.summary.expensesTotal],
    ['Outstanding Advances', data.summary.outstandingAdvances],
    ['Reimbursed YTD', data.summary.reimbursedYtd],
    ['Net Position', data.summary.net],
  ]);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  if (payslips.length) {
    const ps = XLSX.utils.json_to_sheet(payslips.map((p: any) => ({
      Period: `${MONTHS[(p.month || 1) - 1]} ${p.year}`,
      'Slip #': p.slip_number || p.invoice_number,
      Gross: Number(p.gross_payment || 0),
      Deductions: Number(p.total_deductions || 0),
      Net: Number(p.net_payment || 0),
      Issued: p.date_issued,
    })));
    XLSX.utils.book_append_sheet(wb, ps, 'Payslips');
  }

  if (requests.length) {
    const rs = XLSX.utils.json_to_sheet(requests.map((r: any) => ({
      Date: format(new Date(r.created_at), 'yyyy-MM-dd'),
      Type: r.kind,
      Category: data.categories?.find((c: any) => c.id === r.category_id)?.name || '',
      Amount: Number(r.amount),
      Status: r.status,
      Reason: r.reason,
      'Approver Note': r.approver_note,
    })));
    XLSX.utils.book_append_sheet(wb, rs, 'Requests');
  }

  if (data.budgets.length) {
    const bs = XLSX.utils.json_to_sheet(data.budgets.map((b) => ({
      Kind: b.budget.kind,
      Scope: b.budget.scope_type,
      'Monthly Limit': Number(b.budget.monthly_limit),
      Used: b.used,
      Remaining: b.remaining,
      'Pct Used': b.pct,
    })));
    XLSX.utils.book_append_sheet(wb, bs, 'Budgets');
  }

  XLSX.writeFile(wb, `finance-${data.period}-${format(data.rangeStart, 'yyyyMMdd')}.xlsx`);
}
