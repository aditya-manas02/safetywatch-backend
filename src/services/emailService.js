import nodemailer from "nodemailer";
import dotenv from "dotenv";
import dns from "dns";
import { promisify } from "util";

const resolveMx = promisify(dns.resolveMx);
dotenv.config();

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  "temp-mail.org", "guerrillamail.com", "sharklasers.com", "mailinator.com",
  "10minutemail.com", "dispostable.com", "getnada.com", "tempmail.net"
]);

/**
 * Validates if an email domain exists and can receive mail
 * @param {string} email 
 * @returns {Promise<{valid: boolean, message?: string}>}
 */
export const validateEmailDomain = async (email) => {
  const domain = email.split("@")[1]?.toLowerCase();
  
  if (!domain) return { valid: false, message: "Invalid email format" };

  // 1. Check if it's a known disposable domain
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, message: "Disposable email addresses are not allowed for security reasons." };
  }

  // 2. Check for MX records (Mail Exchange)
  try {
    const mxRecords = await resolveMx(domain);
    
    // Filter out invalid or "Null MX" records (RFC 7505)
    const validMx = mxRecords.filter(record => 
      record.exchange && 
      record.exchange !== "." && 
      record.exchange !== ""
    );

    if (validMx.length === 0) {
      return { valid: false, message: `The domain @${domain} is configured to not receive emails or has no valid mail servers.` };
    }
    return { valid: true };
  } catch (error) {
    if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
      return { valid: false, message: `The email domain @${domain} does not exist.` };
    }
    // For other DNS errors (timeout, etc.), we'll be lenient to avoid false negatives
    console.warn(`DNS check failed for ${domain}:`, error.message);
    return { valid: true }; 
  }
};

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
const sendViaBrevo = async (to, subject, html, text = null, retries = 2) => {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  
  // CRITICAL: Brevo requires sender email to be verified in their dashboard
  // Using the SMTP_USER as it should be verified
  const fromEmail = process.env.SMTP_USER || "safetywatch4neighbour@gmail.com";
  const fromName = process.env.EMAIL_FROM_NAME || "SafetyWatch";
  
  if (!apiKey) {
    console.log("[EMAIL] Brevo API key not configured, skipping...");
    return { success: false, error: { message: "No Brevo API key" } };
  }
  
  console.log(`[EMAIL] Attempting via BREVO to: ${to} from: ${fromEmail}...`);

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
          textContent: text || html.replace(/<[^>]*>/g, ''),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`[EMAIL] ✅ Brevo success on attempt ${attempt}:`, data.messageId);
        return { success: true, info: data };
      } else {
        console.error(`[EMAIL] ❌ Brevo API Error (attempt ${attempt}/${retries}):`, {
          status: response.status,
          message: data.message,
          code: data.code,
          details: data
        });
        
        // Don't retry on authentication errors
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: data };
        }
        
        if (attempt === retries) return { success: false, error: data };
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
      }
    } catch (error) {
      console.error(`[EMAIL] ❌ Brevo Fetch Error (attempt ${attempt}/${retries}):`, error.message);
      if (attempt === retries) return { success: false, error };
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
    }
  }
  return { success: false, error: { message: "Brevo max retries" } };
};

/**
 * Send email via Resend HTTP API
 */
const sendViaResend = async (to, subject, html, text = null) => {
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
        text: text || html.replace(/<[^>]*>/g, ''),
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
const deliverEmail = async (to, subject, html, text = null) => {
  // 1. Try Brevo (Most reliable HTTP API currently configured)
  if (process.env.BREVO_API_KEY) {
    const res = await sendViaBrevo(to, subject, html, text);
    if (res.success) return res;
  }

  // 2. Try Resend (Next best HTTP API)
  if (process.env.RESEND_API_KEY) {
    const res = await sendViaResend(to, subject, html, text);
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
        text: text || html.replace(/<[^>]*>/g, ''),
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
  const subject = "Your SafetyWatch Verification Code";
  
  // Plain text version (important for spam filters)
  const text = `
Hello,

Thank you for registering with SafetyWatch!

Your verification code is: ${otp}

This code will expire in 10 minutes.

If you didn't request this code, you can safely ignore this email.

Best regards,
SafetyWatch Team

---
SafetyWatch - Neighborhood Security Platform
This is an automated message, please do not reply.
  `;

  // HTML version (improved to avoid spam triggers)
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">SafetyWatch</h1>
          <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">Neighborhood Security Platform</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <p style="font-size: 16px; color: #1f2937; margin: 0 0 20px 0; line-height: 1.5;">Hello,</p>
          <p style="font-size: 16px; color: #1f2937; margin: 0 0 30px 0; line-height: 1.5;">Thank you for registering with SafetyWatch. Please use the verification code below to complete your registration:</p>
          
          <!-- OTP Box -->
          <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 30px; border-radius: 10px; text-align: center; margin: 30px 0; border: 2px solid #2563eb;">
            <div style="font-size: 14px; color: #64748b; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Verification Code</div>
            <div style="font-size: 42px; font-weight: bold; color: #1e40af; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              ${otp}
            </div>
          </div>
          
          <p style="font-size: 14px; color: #64748b; margin: 20px 0; line-height: 1.6;">
            <strong>Important:</strong> This code will expire in 10 minutes for security reasons.
          </p>
          
          <p style="font-size: 14px; color: #64748b; margin: 20px 0; line-height: 1.6;">
            If you didn't request this code, you can safely ignore this email. Your account security is our priority.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #9ca3af; margin: 0 0 8px 0; line-height: 1.5;">
            This is an automated message from SafetyWatch. Please do not reply to this email.
          </p>
          <p style="font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.5;">
            © ${new Date().getFullYear()} SafetyWatch. All rights reserved.
          </p>
        </div>
      </div>
      
      <!-- Spam folder reminder -->
      <div style="max-width: 600px; margin: 15px auto; padding: 0 20px;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5;">
          📧 <strong>Can't find this email?</strong> Check your spam or junk folder and mark this email as "Not Spam" to ensure you receive future updates.
        </p>
      </div>
    </body>
    </html>
  `;

  // Send with both plain text and HTML
  return await deliverEmail(email, subject, html, text);
};
