import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PayslipEmailRequest {
  employeeName: string;
  employeeEmail: string;
  employeeId: string;
  month: number;
  year: number;
  invoiceNumber: string;
  slipNumber: string;
  grossPayment: number;
  netPayment: number;
  totalDeductions: number;
  pdfBase64?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      employeeName,
      employeeEmail,
      employeeId,
      month,
      year,
      invoiceNumber,
      slipNumber,
      grossPayment,
      netPayment,
      totalDeductions,
      pdfBase64
    }: PayslipEmailRequest = await req.json();

    console.log(`Sending payslip email to ${employeeEmail} for ${employeeName}`);

    if (!employeeEmail) {
      return new Response(
        JSON.stringify({ error: "Employee email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

    // Prepare attachments if PDF is provided
    const attachments = pdfBase64 ? [{
      filename: `${invoiceNumber}.pdf`,
      content: pdfBase64.split(',')[1], // Remove data:application/pdf;base64, prefix
    }] : [];

    const emailPayload: any = {
      from: "Footprints Dynasty Finance <finance@footprintsdynasty.com.ng>",
      reply_to: "footprintsdynasty@gmail.com",
      to: [employeeEmail],
      subject: `Your Payslip for ${monthName} ${year} - ${slipNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
              .detail-label { font-weight: 600; color: #6b7280; }
              .detail-value { font-weight: 700; color: #111827; }
              .amount { font-size: 1.2em; color: #10b981; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 0.9em; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>💼 Payslip Notification</h1>
                <p>Your payment details for ${monthName} ${year}</p>
              </div>
              <div class="content">
                <p>Dear <strong>${employeeName}</strong>,</p>
                <p>Your payslip for <strong>${monthName} ${year}</strong> has been generated. Please find the details below:</p>
                
                <div style="margin: 20px 0;">
                  <div class="detail-row">
                    <span class="detail-label">Employee ID:</span>
                    <span class="detail-value">${employeeId}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Payslip Number:</span>
                    <span class="detail-value">${slipNumber}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Gross Payment:</span>
                    <span class="detail-value">₦${grossPayment.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Total Deductions:</span>
                    <span class="detail-value">₦${totalDeductions.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div class="detail-row" style="background: #f0fdf4; border: none; padding: 15px; border-radius: 5px; margin-top: 10px;">
                    <span class="detail-label" style="font-size: 1.1em;">Net Payment:</span>
                    <span class="amount">₦${netPayment.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                ${pdfBase64 ? '<p>Your detailed payslip is attached to this email as a PDF document.</p>' : ''}
                
                <p style="margin-top: 20px;">If you have any questions or concerns about your payslip, please contact the HR department.</p>
              </div>
              <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>&copy; ${year} Full Data Linking Ltd. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    if (attachments.length > 0) {
      emailPayload.attachments = attachments;
    }

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Resend API error: ${errorText}`);
    }

    const result = await emailResponse.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-payslip-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
