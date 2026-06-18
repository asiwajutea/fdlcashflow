import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Sender config ────────────────────────────────────────────────────────────
const SENDER_DEFAULT   = "Footprints Dynasty <hello@footprintsdynasty.com.ng>";
const SENDER_CANDIDATE = "Footprints Dynasty HR <hr@footprintsdynasty.com.ng>";
const SENDER_FINANCE   = "Footprints Dynasty Finance <finance@footprintsdynasty.com.ng>";
const REPLY_TO         = "footprintsdynasty@gmail.com";

// Templates that go to candidates use the HR sender
const CANDIDATE_TEMPLATES = new Set([
  "candidate_stage", "candidate_screening", "candidate_interview",
  "candidate_offered", "candidate_hired", "candidate_rejected",
]);

// Templates that use the finance sender
const FINANCE_TEMPLATES = new Set([
  "payslip", "finance_decision",
]);

// ─── HTML wrapper ─────────────────────────────────────────────────────────────
function wrap(title: string, body: string, year = new Date().getFullYear()): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;color:#1f2937}
  .wrap{max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#0B1F3B 0%,#1a3a6b 100%);padding:32px 40px;text-align:center}
  .header img{height:48px;border-radius:50%;margin-bottom:12px}
  .header h1{color:#fff;margin:0;font-size:22px;font-weight:700}
  .header p{color:rgba(255,255,255,.7);margin:6px 0 0;font-size:14px}
  .body{padding:36px 40px}
  .body p{line-height:1.7;margin:0 0 16px;font-size:15px}
  .cta{display:inline-block;background:#FF7A00;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:600;font-size:15px;margin:8px 0 20px}
  .info-box{background:#f0f9ff;border-left:4px solid #0B1F3B;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0;font-size:14px}
  .footer{background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;font-size:12px;color:#9ca3af}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>Footprints Dynasty Limited</h1>
    <p>${title}</p>
  </div>
  <div class="body">${body}</div>
  <div class="footer">
    <p>© ${year} Footprints Dynasty Limited · All rights reserved</p>
    <p>This is an automated message. Reply to <a href="mailto:${REPLY_TO}" style="color:#0B1F3B">${REPLY_TO}</a></p>
  </div>
</div>
</body>
</html>`;
}

// ─── Templates ────────────────────────────────────────────────────────────────
interface TemplateResult { subject: string; html: string }

function renderTemplate(key: string, vars: Record<string, any>): TemplateResult | null {
  const v = vars;
  const origin = v.origin || "https://app.footprintsdynasty.com.ng";

  switch (key) {

    // Candidate: application stage transitions
    case "candidate_screening":
      return {
        subject: `Your application has moved to Screening — ${v.job}`,
        html: wrap("Screening Questionnaire", `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>Great news! Your application for the <strong>${v.job}</strong> position has been selected for screening.</p>
          <p>Your next step is to complete the screening questionnaire. Please click the button below to get started:</p>
          <a href="${origin}/screening?applicationId=${v.applicationId}" class="cta">Complete Screening →</a>
          <div class="info-box">
            <strong>⏰ Please complete this promptly</strong> — it is an important step in our evaluation process and helps us assess your suitability for the role.
          </div>
          <p>If you have any questions, please reach out to our HR team.</p>
          <p>Best regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    case "candidate_interview":
      return {
        subject: `Interview Scheduled — ${v.job}`,
        html: wrap("Interview Details", `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>Congratulations! You've been shortlisted for an interview for the <strong>${v.job}</strong> position.</p>
          <p>Please click below to view your interview details and join information:</p>
          <a href="${origin}/interviews" class="cta">View Interview Details →</a>
          <div class="info-box">
            Make sure you're available at the scheduled time and check the interview details for the meeting link or location.
          </div>
          <p>We look forward to speaking with you!</p>
          <p>Best regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    case "candidate_offered":
      return {
        subject: `Job Offer Extended — Action Required · ${v.job}`,
        html: wrap("Job Offer", `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>We are delighted to extend an offer for the <strong>${v.job}</strong> position!</p>
          <p>Please review your contract and sign it at your earliest convenience:</p>
          <a href="${origin}/offers" class="cta">Review &amp; Sign Contract →</a>
          <div class="info-box">
            <strong>Action required:</strong> Your offer requires your signature. Please review the contract carefully and sign by the deadline.
          </div>
          <p>Congratulations and welcome aboard!</p>
          <p>Best regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    case "candidate_hired":
      return {
        subject: `Welcome to Footprints Dynasty! 🎉`,
        html: wrap("Welcome to the Team!", `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>Welcome aboard! You've been officially hired for the <strong>${v.job}</strong> position.</p>
          <p>We're excited to have you join the Footprints Dynasty family. Your onboarding details will be shared with you shortly.</p>
          <a href="${origin}/dashboard" class="cta">Go to Your Dashboard →</a>
          <div class="info-box">
            Your account is now active. Log in to complete your profile and access your new workspace.
          </div>
          <p>Congratulations and welcome to the team!</p>
          <p>Best regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    case "candidate_rejected":
      return {
        subject: `Update on your application — ${v.job}`,
        html: wrap("Application Update", `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>Thank you for your interest in the <strong>${v.job}</strong> position and for taking the time to go through our process.</p>
          <p>After careful consideration, we have decided to move forward with other candidates at this time.</p>
          <p>We encourage you to apply for future openings that match your skills and experience.</p>
          <a href="${origin}/careers" class="cta">View Open Positions →</a>
          <p>We wish you all the best in your job search.</p>
          <p>Best regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    // Employee: payslip
    case "payslip":
      return {
        subject: `Your Payslip for ${v.month} ${v.year} — ${v.slipNumber}`,
        html: wrap(`Payslip · ${v.month} ${v.year}`, `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>Your payslip for <strong>${v.month} ${v.year}</strong> has been generated. Details below:</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 0;color:#6b7280;font-size:14px">Employee ID</td><td style="text-align:right;font-weight:600">${v.employeeId}</td></tr>
            <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 0;color:#6b7280;font-size:14px">Slip Number</td><td style="text-align:right;font-weight:600">${v.slipNumber}</td></tr>
            <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 0;color:#6b7280;font-size:14px">Gross Payment</td><td style="text-align:right;font-weight:600">₦${Number(v.gross||0).toLocaleString('en-NG')}</td></tr>
            <tr style="border-bottom:1px solid #e5e7eb"><td style="padding:10px 0;color:#6b7280;font-size:14px">Deductions</td><td style="text-align:right;font-weight:600">₦${Number(v.deductions||0).toLocaleString('en-NG')}</td></tr>
            <tr style="background:#f0fdf4"><td style="padding:12px;font-weight:700">Net Payment</td><td style="text-align:right;font-weight:700;color:#10b981;font-size:16px">₦${Number(v.net||0).toLocaleString('en-NG')}</td></tr>
          </table>
          ${v.pdfAttached ? '<p>Your detailed payslip PDF is attached to this email.</p>' : ''}
          <a href="${origin}/my-invoices" class="cta">View All Payslips →</a>
          <p>Best regards,<br/><strong>Finance Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    // Finance: advance request decision
    case "finance_decision":
      return {
        subject: `Finance Request ${v.status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
        html: wrap(`Finance Request ${v.status === 'approved' ? 'Approved' : 'Rejected'}`, `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>Your finance request of <strong>₦${Number(v.amount||0).toLocaleString('en-NG')}</strong> has been <strong>${v.status}</strong>.</p>
          ${v.note ? `<div class="info-box"><strong>Note from approver:</strong><br/>${v.note}</div>` : ''}
          <a href="${origin}/my-finance" class="cta">View Finance Details →</a>
          <p>Best regards,<br/><strong>Finance Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    // User approval
    case "user_approved":
      return {
        subject: `Your account has been approved — Footprints Dynasty`,
        html: wrap("Account Approved!", `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>Your account has been approved. You can now log in to your workspace.</p>
          <a href="${origin}/dashboard" class="cta">Go to Dashboard →</a>
          <div class="info-box">Your access code: <strong style="font-size:18px;letter-spacing:2px">${v.passcode || '—'}</strong></div>
          <p>Best regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    // New inbox message notification
    case "new_message":
      return {
        subject: `New message: ${v.subject}`,
        html: wrap("New Message", `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>You have a new message from <strong>${v.from}</strong>:</p>
          <div class="info-box"><strong>${v.subject}</strong><br/><br/>${v.preview}</div>
          <a href="${origin}/inbox" class="cta">Read Message →</a>
          <p>Best regards,<br/><strong>Footprints Dynasty</strong></p>
        `),
      };

    // Password / account reset
    case "account_created":
      return {
        subject: `Your Footprints Dynasty account has been created`,
        html: wrap("Account Created", `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>An account has been created for you on the Footprints Dynasty workforce platform.</p>
          <div class="info-box">
            <strong>Your login details:</strong><br/>
            Email: ${v.email}<br/>
            Temporary access code: <strong>${v.passcode}</strong>
          </div>
          <a href="${origin}/auth" class="cta">Log In Now →</a>
          <p>Best regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    case "test_email":
      return {
        subject: `✅ Test Email — Resend API is working`,
        html: wrap("Test Email", `
          <p>Dear <strong>${v.name || 'Admin'}</strong>,</p>
          <p>This is a test email sent from the <strong>Footprints Dynasty</strong> workforce platform to verify that the Resend email integration is working correctly.</p>
          <div class="info-box">
            <strong>Test details:</strong><br/>
            Sent at: ${new Date().toUTCString()}<br/>
            Template: test_email<br/>
            Sender: ${CANDIDATE_TEMPLATES.has('test_email') ? 'HR' : 'Default'}
          </div>
          <p>If you received this email, the Resend API is configured and working. ✅</p>
          <p>Best regards,<br/><strong>Footprints Dynasty Platform</strong></p>
        `),
      };

    default:
      return null;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let logEntry: any = { status: "failed" };

  try {
    const { template_key, to, name, user_id, vars = {}, attachments = [] } = await req.json();

    if (!template_key || !to) {
      return new Response(JSON.stringify({ error: "template_key and to are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const rendered = renderTemplate(template_key, { ...vars, name: name || vars.name || "there" });
    if (!rendered) {
      logEntry = { template_key, recipient_email: to, recipient_name: name, user_id, subject: "unknown", status: "skipped", error: `Unknown template: ${template_key}`, vars };
      await admin.from("email_logs").insert(logEntry);
      return new Response(JSON.stringify({ skipped: true, reason: `Unknown template: ${template_key}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const from = CANDIDATE_TEMPLATES.has(template_key)
      ? SENDER_CANDIDATE
      : FINANCE_TEMPLATES.has(template_key)
        ? SENDER_FINANCE
        : SENDER_DEFAULT;

    const payload: any = {
      from,
      reply_to: REPLY_TO,
      to: [to],
      subject: rendered.subject,
      html: rendered.html,
    };
    if (attachments.length > 0) payload.attachments = attachments;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      logEntry = { template_key, recipient_email: to, recipient_name: name, user_id, subject: rendered.subject, status: "failed", error: JSON.stringify(result), vars };
      await admin.from("email_logs").insert(logEntry);
      return new Response(JSON.stringify({ error: result }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logEntry = { template_key, recipient_email: to, recipient_name: name, user_id, subject: rendered.subject, status: "sent", resend_id: result.id, vars };
    await admin.from("email_logs").insert(logEntry);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("send-email error", e);
    await admin.from("email_logs").insert({ ...logEntry, error: e.message }).catch(() => {});
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
