import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Sender addresses ─────────────────────────────────────────────────────────
// All addresses use the verified domain: footprintsdynasty.com.ng
const FROM = {
  default:   "Footprints Dynasty <hello@footprintsdynasty.com.ng>",
  hr:        "Footprints Dynasty HR <hr@footprintsdynasty.com.ng>",
  finance:   "Footprints Dynasty Finance <finance@footprintsdynasty.com.ng>",
  platform:  "Footprints Dynasty Platform <no-reply@footprintsdynasty.com.ng>",
};
const REPLY_TO = "footprintsdynasty@gmail.com";

// ─── Template → sender mapping ────────────────────────────────────────────────
function senderFor(key: string): string {
  const hr      = ["candidate_screening","candidate_interview","candidate_offered","candidate_hired","candidate_rejected","user_approved","account_created","candidate_stage"];
  const finance = ["payslip","finance_decision"];
  const platform = ["test_email","new_message"];
  if (hr.includes(key))      return FROM.hr;
  if (finance.includes(key)) return FROM.finance;
  if (platform.includes(key)) return FROM.platform;
  return FROM.default;
}

// ─── HTML shell ───────────────────────────────────────────────────────────────
function wrap(title: string, body: string, year = new Date().getFullYear()): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased}
  .outer{padding:32px 16px}
  .card{max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#0B1F3B 0%,#1a3a6b 100%);padding:36px 40px;text-align:center}
  .header h1{color:#ffffff;font-size:22px;font-weight:700;margin:0}
  .header p{color:rgba(255,255,255,.65);font-size:13px;margin-top:6px}
  .body{padding:36px 40px}
  .body p{line-height:1.75;margin-bottom:16px;font-size:15px;color:#334155}
  .cta{display:inline-block;background:#FF7A00;color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:8px;font-weight:600;font-size:15px;margin:8px 0 20px;letter-spacing:.01em}
  .info-box{background:#f0f9ff;border-left:4px solid #0B1F3B;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0;font-size:14px;color:#1e293b}
  .divider{border:none;border-top:1px solid #e2e8f0;margin:24px 0}
  table.detail{width:100%;border-collapse:collapse;margin:20px 0}
  table.detail td{padding:10px 0;font-size:14px;border-bottom:1px solid #e2e8f0}
  table.detail .label{color:#64748b}
  table.detail .value{text-align:right;font-weight:600;color:#1e293b}
  table.detail tr.total td{background:#f0fdf4;padding:12px;border-bottom:none}
  table.detail tr.total .value{color:#10b981;font-size:16px}
  .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;font-size:12px;color:#94a3b8}
  .footer a{color:#0B1F3B;text-decoration:none}
</style>
</head>
<body>
<div class="outer">
<div class="card">
  <div class="header">
    <h1>Footprints Dynasty Limited</h1>
    <p>${title}</p>
  </div>
  <div class="body">${body}</div>
  <div class="footer">
    <p>© ${year} Footprints Dynasty Limited &nbsp;·&nbsp; All rights reserved</p>
    <p style="margin-top:6px">Questions? Reply to <a href="mailto:${REPLY_TO}">${REPLY_TO}</a></p>
  </div>
</div>
</div>
</body>
</html>`;
}

// ─── Templates ────────────────────────────────────────────────────────────────
interface Rendered { subject: string; html: string }

function renderTemplate(key: string, vars: Record<string, any>): Rendered | null {
  const v = vars;
  const origin = v.origin || "https://footprintsdynasty.com.ng";

  switch (key) {

    /* ── HR / Candidate ─────────────────────────────────────────────── */
    case "candidate_screening":
      return {
        subject: `Action Required: Complete Your Screening — ${v.job}`,
        html: wrap("Screening Questionnaire", `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>Great news! Your application for the <strong>${v.job}</strong> position has been selected for the screening stage.</p>
          <p>Your next step is to complete the screening questionnaire. Please click the button below to get started:</p>
          <a href="${origin}/screening?applicationId=${v.applicationId}" class="cta">Complete Screening →</a>
          <div class="info-box">
            <strong>⏰ Please complete this promptly.</strong> This is an important part of our evaluation process and helps us understand your suitability for the role.
          </div>
          <p>If you have any questions, please don't hesitate to reach out to our HR team.</p>
          <p>Best regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    case "candidate_interview":
      return {
        subject: `You've Been Shortlisted — Interview Details for ${v.job}`,
        html: wrap("Interview Scheduled", `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>Congratulations! You've been shortlisted for an interview for the <strong>${v.job}</strong> position.</p>
          <p>Please click the button below to view your interview details, including the date, time, and joining link:</p>
          <a href="${origin}/interviews" class="cta">View Interview Details →</a>
          <div class="info-box">
            Ensure you are available at the scheduled time. Check the platform for the meeting link or location information.
          </div>
          <p>We look forward to speaking with you!</p>
          <p>Best regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    case "candidate_offered":
      return {
        subject: `Job Offer — Action Required · ${v.job}`,
        html: wrap("Job Offer Extended", `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>We are delighted to extend a job offer for the <strong>${v.job}</strong> position at Footprints Dynasty Limited!</p>
          <p>Please review your contract carefully and sign at your earliest convenience:</p>
          <a href="${origin}/offers" class="cta">Review &amp; Sign Contract →</a>
          <div class="info-box">
            <strong>Action required:</strong> Your offer requires your electronic signature. Please review all terms before signing.
          </div>
          <p>Congratulations and welcome to the Footprints Dynasty family!</p>
          <p>Best regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    case "candidate_hired":
      return {
        subject: `Welcome to Footprints Dynasty! 🎉`,
        html: wrap("Welcome to the Team!", `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>Welcome aboard! You have been officially hired for the <strong>${v.job}</strong> position at Footprints Dynasty Limited.</p>
          <p>We are excited to have you join our team. Your onboarding details will be shared with you shortly.</p>
          <a href="${origin}/dashboard" class="cta">Access Your Dashboard →</a>
          <div class="info-box">
            Your account is now active. Log in to complete your profile and get started with your new workspace.
          </div>
          <p>Once again, congratulations and welcome to the team!</p>
          <p>Best regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    case "candidate_rejected":
      return {
        subject: `Update on Your Application — ${v.job}`,
        html: wrap("Application Update", `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>Thank you for your interest in the <strong>${v.job}</strong> position and for the time you invested in our recruitment process.</p>
          <p>After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current requirements.</p>
          <p>We encourage you to watch for future openings that align with your skills and experience:</p>
          <a href="${origin}/careers" class="cta">View Open Positions →</a>
          <p>We appreciate your interest in Footprints Dynasty and wish you every success in your job search.</p>
          <p>Best regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    case "user_approved":
      return {
        subject: `Your Account Has Been Approved — Footprints Dynasty`,
        html: wrap("Account Approved!", `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>Your Footprints Dynasty workforce account has been approved. You can now log in to your workspace.</p>
          <a href="${origin}/auth" class="cta">Log In to Your Account →</a>
          <div class="info-box">
            <strong>Your access code:</strong><br/>
            <span style="font-size:22px;letter-spacing:3px;font-weight:700;font-family:monospace">${v.passcode || '—'}</span><br/>
            <span style="font-size:12px;color:#64748b">Keep this safe — you will need it to sign in.</span>
          </div>
          <p>Best regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    case "account_created":
      return {
        subject: `Your Footprints Dynasty Account Has Been Created`,
        html: wrap("Account Created", `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>An account has been created for you on the Footprints Dynasty workforce platform.</p>
          <div class="info-box">
            <strong>Your login details:</strong><br/>
            Email: <strong>${v.email}</strong><br/>
            Temporary access code: <strong style="font-size:18px;letter-spacing:2px">${v.passcode}</strong>
          </div>
          <a href="${origin}/auth" class="cta">Log In Now →</a>
          <p>Best regards,<br/><strong>HR Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    /* ── Finance ────────────────────────────────────────────────────── */
    case "payslip":
      return {
        subject: `Your Payslip for ${v.month} ${v.year} — ${v.slipNumber}`,
        html: wrap(`Payslip · ${v.month} ${v.year}`, `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>Your payslip for <strong>${v.month} ${v.year}</strong> has been generated. Please find the details below:</p>
          <table class="detail">
            <tr><td class="label">Employee ID</td><td class="value">${v.employeeId || '—'}</td></tr>
            <tr><td class="label">Payslip Number</td><td class="value">${v.slipNumber || '—'}</td></tr>
            <tr><td class="label">Gross Payment</td><td class="value">₦${Number(v.gross || 0).toLocaleString('en-NG')}</td></tr>
            <tr><td class="label">Total Deductions</td><td class="value">₦${Number(v.deductions || 0).toLocaleString('en-NG')}</td></tr>
            <tr class="total"><td class="label" style="font-weight:700">Net Payment</td><td class="value">₦${Number(v.net || 0).toLocaleString('en-NG')}</td></tr>
          </table>
          ${v.pdfAttached ? '<p>Your detailed payslip PDF is attached to this email.</p>' : ''}
          <a href="${origin}/my-invoices" class="cta">View All Payslips →</a>
          <p>Best regards,<br/><strong>Finance Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    case "finance_decision":
      return {
        subject: `Finance Request ${v.status === 'approved' ? 'Approved ✅' : 'Update ❌'} — ${Number(v.amount || 0).toLocaleString('en-NG')} NGN`,
        html: wrap(`Finance Request ${v.status === 'approved' ? 'Approved' : 'Rejected'}`, `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>Your finance request of <strong>₦${Number(v.amount || 0).toLocaleString('en-NG')}</strong> has been <strong style="color:${v.status === 'approved' ? '#10b981' : '#ef4444'}">${v.status}</strong>.</p>
          ${v.note ? `<div class="info-box"><strong>Note from approver:</strong><br/>${v.note}</div>` : ''}
          <a href="${origin}/my-finance" class="cta">View Finance Details →</a>
          <p>Best regards,<br/><strong>Finance Team</strong><br/>Footprints Dynasty Limited</p>
        `),
      };

    /* ── Platform / System ──────────────────────────────────────────── */
    case "new_message":
      return {
        subject: `New Message: ${v.subject || '(no subject)'}`,
        html: wrap("New Message", `
          <p>Dear <strong>${v.name}</strong>,</p>
          <p>You have a new message from <strong>${v.from || 'a team member'}</strong>:</p>
          <div class="info-box">
            <strong>${v.subject || '(no subject)'}</strong><br/><br/>
            ${v.preview || ''}
          </div>
          <a href="${origin}/inbox" class="cta">Read Message →</a>
          <p>Best regards,<br/><strong>Footprints Dynasty Platform</strong></p>
        `),
      };

    case "test_email":
      return {
        subject: `✅ Test Email — Email service is working`,
        html: wrap("Test Email", `
          <p>Dear <strong>${v.name || 'Admin'}</strong>,</p>
          <p>This is a test email from the <strong>Footprints Dynasty</strong> workforce platform confirming that the Resend email service is working correctly.</p>
          <div class="info-box">
            <strong>Test details</strong><br/>
            Sent at: ${new Date().toUTCString()}<br/>
            Domain: footprintsdynasty.com.ng<br/>
            Service: Resend
          </div>
          <p>If you received this email, the email service is fully operational. ✅</p>
          <p>Best regards,<br/><strong>Footprints Dynasty Platform</strong></p>
        `),
      };

    // ── Holiday greeting ─────────────────────────────────────────────
    // `title`   — short holiday name (e.g. "New Year's Day") → used in subject & heading
    // `holiday` — full SMS message body → NOT used in email
    case "holiday_greeting": {
      const title = v.title || v.holiday || 'Holiday';
      return {
        subject: `Happy ${title} from Footprints Dynasty! 🎉`,
        html: wrap(`Happy ${title}!`, `
          <p>Dear <strong>${v.name || 'Team Member'}</strong>,</p>
          <p>Happy <strong>${title}</strong> from all of us at Footprints Dynasty Limited! 🎉</p>
          <p>Wishing you and your loved ones a wonderful celebration filled with joy, rest, and togetherness.</p>
          <div class="info-box">
            We appreciate everything you do. See you on the other side!
          </div>
          <p>With warm regards,<br/><strong>The Footprints Dynasty Team</strong></p>
        `),
      };
    }

    // ── Daily digest — unread inbox messages ─────────────────────────
    case "inbox_digest":
      return {
        subject: `You have ${v.count || 'unread'} unread message${Number(v.count) !== 1 ? 's' : ''} — FDL Inbox`,
        html: wrap("Unread Messages", `
          <p>Dear <strong>${v.name || 'Team Member'}</strong>,</p>
          <p>You have <strong>${v.count || 'some'} unread message${Number(v.count) !== 1 ? 's' : ''}</strong> waiting in your FDL Workforce inbox.</p>
          ${v.previews ? `
          <div class="info-box">
            <strong>Recent messages:</strong><br/>
            ${v.previews}
          </div>` : ''}
          <a href="${v.origin || 'https://footprintsdynasty.com.ng'}/inbox" class="cta">View Your Inbox →</a>
          <p style="font-size:12px;color:#94a3b8;margin-top:16px">
            You will stop receiving these reminders once you open your messages.
            Reminders stop automatically after 7 days.
          </p>
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
    const { template_key, to: rawTo, name, user_id, vars = {}, attachments = [] } = await req.json();

    if (!template_key || (!rawTo && !user_id)) {
      return new Response(JSON.stringify({ error: "template_key and (to or user_id) are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve email address — if `to` looks like a UUID or is missing, look up via auth.users
    let to = rawTo;
    let resolvedName = name;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawTo || '');
    if ((!to || isUuid) && user_id) {
      const { data: authUser } = await admin.auth.admin.getUserById(user_id);
      if (authUser?.user?.email) {
        to = authUser.user.email;
        if (!resolvedName) {
          resolvedName = authUser.user.user_metadata?.full_name || authUser.user.email.split('@')[0];
        }
      }
    }

    if (!to) {
      return new Response(JSON.stringify({ skipped: true, reason: "Could not resolve recipient email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const rendered = renderTemplate(template_key, { ...vars, name: resolvedName || vars.name || "there" });

    if (!rendered) {
      logEntry = { template_key, recipient_email: to, recipient_name: resolvedName, user_id, subject: "—", status: "skipped", error: `Unknown template: ${template_key}`, vars };
      await admin.from("email_logs").insert(logEntry);
      return new Response(JSON.stringify({ skipped: true, reason: `Unknown template: ${template_key}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const from = senderFor(template_key);

    const payload: Record<string, any> = {
      from,
      reply_to: REPLY_TO,
      to: [to],
      subject: rendered.subject,
      html: rendered.html,
    };
    if (attachments.length > 0) payload.attachments = attachments;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      logEntry = { template_key, recipient_email: to, recipient_name: resolvedName, user_id, subject: rendered.subject, status: "failed", error: JSON.stringify(result), vars };
      await admin.from("email_logs").insert(logEntry);
      return new Response(JSON.stringify({ error: result }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logEntry = { template_key, recipient_email: to, recipient_name: resolvedName, user_id, subject: rendered.subject, status: "sent", resend_id: result.id, vars };
    await admin.from("email_logs").insert(logEntry);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("send-email error:", e);
    await admin.from("email_logs").insert({ ...logEntry, error: e.message }).catch(() => {});
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
