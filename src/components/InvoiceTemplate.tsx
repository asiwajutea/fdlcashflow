import React from 'react';
import fdlLogo from '@/assets/fdl-logo.jpg';
interface InvoiceTemplateProps {
  employee: {
    employee_id: string;
    full_name: string;
    designation: string;
  };
  invoiceNumber: string;
  slipNumber: string;
  month: number;
  year: number;
  dateIssued: string;
  earnings: Array<{
    description: string;
    amount: string;
  }>;
  deductions: Array<{
    description: string;
    amount: string;
  }>;
  totals: {
    grossPayment: number;
    totalDeductions: number;
    netPayment: number;
    totalSavings: number;
  };
  additionalFields: {
    totalMonthlyIncome: string;
    outstandingIou: string;
    downPayment: string;
    egf: string;
  };
}
export const InvoiceTemplate = ({
  employee,
  invoiceNumber,
  slipNumber,
  month,
  year,
  dateIssued,
  earnings,
  deductions,
  totals,
  additionalFields
}: InvoiceTemplateProps) => {
  const [companySettings, setCompanySettings] = React.useState<any>(null);
  React.useEffect(() => {
    const fetchCompanySettings = async () => {
      const {
        data
      } = await fetch('https://elqwtrwrsbvgezhemrwn.supabase.co/rest/v1/company_settings?select=*', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscXd0cndyc2J2Z2V6aGVtcnduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzU4ODAsImV4cCI6MjA3NDY1MTg4MH0.4h6_sB4qNfAdT0rTsRwmGJoiu2XHZql-mxlNLdF_HqU',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscXd0cndyc2J2Z2V6aGVtcnduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzU4ODAsImV4cCI6MjA3NDY1MTg4MH0.4h6_sB4qNfAdT0rTsRwmGJoiu2XHZql-mxlNLdF_HqU'
        }
      }).then(res => res.json());
      if (data && data.length > 0) {
        setCompanySettings(data[0]);
      }
    };
    fetchCompanySettings();
  }, []);
  const monthName = new Date(year, month - 1).toLocaleString('default', {
    month: 'long'
  });
  const formattedDate = new Date(dateIssued).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  return <div id="invoice-template" className="bg-white text-black p-8 max-w-4xl mx-auto" style={{
    fontFamily: 'Arial, sans-serif'
  }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-6 border-b-2 border-gray-800 pb-4">
        <div>
          <h1 className="text-xl font-bold mb-1">
            PAYSLIP FOR {monthName.toUpperCase()} {year}
          </h1>
          <h2 className="text-2xl font-bold text-gray-700">{companySettings?.company_name || 'FOOTPRINTS DYNASTY'}</h2>
        </div>
        <div className="flex flex-col items-end gap-2">
          <img src={companySettings?.logo_url || fdlLogo} alt="Company Logo" className="h-60 w-auto " />
          <div className="text-right">
            <p className="text-sm mt-1">Date Issued: {formattedDate}</p>
          </div>
        </div>
      </div>

      {/* Employee and Employer Details */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <h3 className="font-bold text-lg mb-2 border-b border-gray-300 pb-1">Employee's Details</h3>
          <div className="space-y-1 text-sm">
            <p><span className="font-semibold">Employee Name:</span> {employee.full_name}</p>
            <p><span className="font-semibold">ID:</span> #{employee.employee_id}</p>
            <p><span className="font-semibold">Designation:</span> {employee.designation}</p>
            <p><span className="font-semibold">Slip No:</span> {slipNumber}</p>
          </div>
        </div>

        <div className="text-right">
          <h3 className="font-bold text-lg mb-2 border-b border-gray-300 pb-1">Employer's Details</h3>
          <div className="text-sm">
            <p className="font-semibold">{companySettings?.company_name || 'FOOTPRINTS DYNASTY LTD'}</p>
            {companySettings?.company_address ? <p className="whitespace-pre-line">{companySettings.company_address}</p> : <>
                <p>Floor 6, Cocoa House, Dugbe</p>
                <p>Ibadan, Oyo State</p>
                <p>Nigeria</p>
              </>}
            {companySettings?.company_phone && <p>Tel: {companySettings.company_phone}</p>}
            {companySettings?.company_email && <p>Email: {companySettings.company_email}</p>}
          </div>
        </div>
      </div>

      {/* Earnings */}
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-3 bg-gray-100 px-3 py-2">EARNINGS</h3>
        <table className="w-full mb-2">
          <tbody>
            {earnings.map((item, idx) => <tr key={idx} className="border-b border-gray-200">
                <td className="py-2 text-sm">{item.description}</td>
                <td className="py-2 text-sm text-right font-semibold">
                  ₦{parseFloat(item.amount).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>

      {/* Gross Payment */}
      <div className="mb-6 bg-gray-100 px-3 py-2">
        <h3 className="font-bold text-lg">
          GROSS PAYMENT: ₦{totals.grossPayment.toLocaleString('en-NG', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}
        </h3>
      </div>

      {/* Deductions */}
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-3 bg-gray-100 px-3 py-2">DEDUCTIONS</h3>
        <table className="w-full mb-2">
          <tbody>
            {deductions.map((item, idx) => <tr key={idx} className="border-b border-gray-200">
                <td className="py-2 text-sm">{item.description}</td>
                <td className="py-2 text-sm text-right font-semibold">
                  ₦{parseFloat(item.amount).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
                </td>
              </tr>)}
          </tbody>
        </table>
        <p className="text-right font-semibold">
          Total Deduction: ₦{totals.totalDeductions.toLocaleString('en-NG', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}
        </p>
      </div>

      {/* Net Payment */}
      <div className="mb-6 bg-gray-800 text-white px-3 py-3">
        <h3 className="font-bold text-xl">
          NET PAYMENT: ₦{totals.netPayment.toLocaleString('en-NG', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}
        </h3>
      </div>

      {/* Additional Information */}
      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p><span className="font-semibold">Total Monthly Income:</span> ₦{parseFloat(additionalFields.totalMonthlyIncome || '0').toLocaleString('en-NG', {
            minimumFractionDigits: 2
          })}</p>
          <p><span className="font-semibold">Outstanding IOU:</span> ₦{parseFloat(additionalFields.outstandingIou || '0').toLocaleString('en-NG', {
            minimumFractionDigits: 2
          })}</p>
        </div>
        <div className="text-right">
          <p><span className="font-semibold">Down Payment:</span> ₦{parseFloat(additionalFields.downPayment || '0').toLocaleString('en-NG', {
            minimumFractionDigits: 2
          })}</p>
          <p><span className="font-semibold">EGF:</span> ₦{parseFloat(additionalFields.egf || '0').toLocaleString('en-NG', {
            minimumFractionDigits: 2
          })}</p>
          <p className="font-bold mt-2">Total Savings: ₦{totals.totalSavings.toLocaleString('en-NG', {
            minimumFractionDigits: 2
          })}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-300 pt-4 text-xs space-y-2">
        <h4 className="font-bold text-sm">Payment Details</h4>
        <p>
          {companySettings?.invoice_footer || 'Payment would be made to employee\'s bank account provided during application within the next 5 days upon the receipt of this slip. This is a payslip and might be subjected to review. For concerns, contact your supervisor.'}
        </p>
        <p className="italic text-gray-600 mt-4">
          This is a system generated payslip by {companySettings?.company_name || 'Footprints Dynasty Ltd (FDL)'} and doesn't require signature
        </p>
      </div>
    </div>;
};