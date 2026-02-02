import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// SMTP Transporter - Keep as a fallback but optimized for failure-prone environments (Render)
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
    servername: "smtp.gmail.com"
  },
  pool: false, 
  connectionTimeout: 5000, // Reduced to 5s to fail fast
  greetingTimeout: 5000,
  socketTimeout: 5000,
  logger: false, // Disabled full logger to keep logs clean
  debug: false,
});

// Non-blocking verification on startup
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter.verify((error, _success) => {
    if (error) {
      console.warn("SMTP Alert: Porter 465/587 likely blocked (ETIMEDOUT). Falling back to HTTP APIs. Error:", error.message);
    } else {
      console.log("SMTP Server is ready to take our messages");
    }
  });
}

/**
 * Send email via Brevo (Sendinblue) HTTP API with retry logic
 */
const sendViaBrevo = async (to, subject, html, retries = 2) => {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromEmail = process.env.EMAIL_FROM || "safetywatch4neighbour@gmail.com";
  const fromName = process.env.EMAIL_FROM_NAME || "SafetyWatch";
  
  console.log(`[EMAIL] Attempting via BREVO to: ${to}...`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: to }],
          replyTo: { email: fromEmail, name: fromName },
          subject,
          htmlContent: html,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`[EMAIL] Brevo success on attempt ${attempt}:`, data.messageId);
        return { success: true, info: data };
      } else {
        console.error(`[EMAIL] Brevo API Error (attempt ${attempt}/${retries}):`, data.message);
        if (attempt === retries) return { success: false, error: data };
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
      }
    } catch (error) {
      console.error(`[EMAIL] Brevo Fetch Error (attempt ${attempt}/${retries}):`, error.message);
      if (attempt === retries) return { success: false, error };
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
    }
  }
  return { success: false, error: { message: "Brevo max retries" } };
};

/**
 * Send email via Resend HTTP API
 */
const sendViaResend = async (to, subject, html) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  
  console.log(`[EMAIL] Attempting via RESEND to: ${to}...`);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `SafetyWatch <${from}>`,
        to: [to],
        subject,
        html,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      console.log("[EMAIL] Resend success:", data.id);
      return { success: true, info: data };
    } else {
      console.error("[EMAIL] Resend error:", data.message);
      return { success: false, error: data };
    }
  } catch (error) {
    console.error("[EMAIL] Resend error:", error.message);
    return { success: false, error };
  }
};

/**
 * Primary sending logic: Prioritizes HTTP APIs (Brevo, Resend) over high-latency SMTP
 */
const deliverEmail = async (to, subject, html) => {
  // 1. Try Brevo (Most reliable HTTP API currently configured)
  if (process.env.BREVO_API_KEY) {
    const res = await sendViaBrevo(to, subject, html);
    if (res.success) return res;
  }

  // 2. Try Resend (Next best HTTP API)
  if (process.env.RESEND_API_KEY) {
    const res = await sendViaResend(to, subject, html);
    if (res.success) return res;
  }

  // 3. Try SMTP (Highly likely to fail or delay on Render, used as last resort)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      console.log(`[EMAIL] Attempting via SMTP to: ${to}...`);
      const mailOptions = {
        from: `"SafetyWatch" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      };
      const info = await transporter.sendMail(mailOptions);
      console.log("[EMAIL] SMTP success:", info.messageId);
      return { success: true, info };
    } catch (error) {
      console.error("[EMAIL] SMTP failed:", error.message);
    }
  }

  console.error(`[CRITICAL] All email delivery methods failed for: ${to}`);
  return { success: false, error: new Error("All delivery methods failed") };
};

/**
 * Send a password reset email
 */
export const sendPasswordResetEmail = async (email, newPassword) => {
  const subject = "SafetyWatch - Your Password has been Reset";
  const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #2563eb;">SafetyWatch Security Alert</h2>
        <p>Hello,</p>
        <p>A password reset was requested for your account. We have generated a new temporary password for you:</p>
        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; margin: 24px 0; color: #0f172a; border: 1px solid #e2e8f0;">
          ${newPassword}
        </div>
        <p><strong>Please log in and change your password immediately.</strong></p>
        <p>If you did not request this, please contact support or ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #64748b;">This is an automated message. Please do not reply.</p>
      </div>
    `;

  return await deliverEmail(email, subject, html);
};

/**
 * Send an OTP email for registration verification
 */
export const sendOTPEmail = async (email, otp) => {
  const subject = "SafetyWatch - Verify Your Email";
  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #2563eb; text-align: center;">SafetyWatch OTP</h2>
        <p style="font-size: 16px;">Hello,</p>
        <p style="font-size: 16px;">Your verification code for SafetyWatch is:</p>
        <div style="background-color: #f4f7ff; padding: 20px; border-radius: 8px; font-size: 36px; font-weight: bold; text-align: center; margin: 20px 0; color: #1e40af; letter-spacing: 5px; border: 2px dashed #2563eb;">
          ${otp}
        </div>
        <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
          Sent by SafetyWatch Neighborhood Security
        </div>
      </div>
    `;

  return await deliverEmail(email, subject, html);
};
