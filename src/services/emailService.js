import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

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
  pool: false, // Disable pooling to prevent stuck idle connections
  connectionTimeout: 10000, // Reduced from 60s to fail fast
  greetingTimeout: 10000,
  socketTimeout: 10000,
  logger: true,
  debug: true,
});

// Verify connection configuration on startup
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter.verify((error, _success) => {
    if (error) {
      console.error("SMTP Connection Error Details:", error);
    } else {
      console.log("SMTP Server is ready to take our messages");
    }
  });
}

/**
 * Send email via Brevo (Sendinblue) HTTP API with retry logic
 */
const sendViaBrevo = async (to, subject, html, retries = 3) => {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromEmail = process.env.EMAIL_FROM || "safetywatch4neighbour@gmail.com";
  const fromName = process.env.EMAIL_FROM_NAME || "SafetyWatch";
  
  console.log(`Attempting to send email via BREVO to: ${to}...`);

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
        console.log(`Brevo Email sent successfully on attempt ${attempt}:`, data.messageId);
        return { success: true, info: data };
      } else {
        console.error(`Brevo API Error (attempt ${attempt}/${retries}):`, JSON.stringify(data));
        
        // If this is the last attempt, return the error
        if (attempt === retries) {
          return { success: false, error: { message: data.message || "Brevo failure", details: data } };
        }
        
        // Wait before retrying (exponential backoff: 500ms, 1s, 2s)
        const waitTime = Math.pow(2, attempt - 1) * 500;
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    } catch (error) {
      console.error(`Brevo Fetch Error (attempt ${attempt}/${retries}):`, error);
      
      // If this is the last attempt, return the error
      if (attempt === retries) {
        return { success: false, error };
      }
      
      // Wait before retrying
      const waitTime = Math.pow(2, attempt - 1) * 500;
      console.log(`Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // This should never be reached, but just in case
  return { success: false, error: { message: "Max retries exceeded" } };
};

/**
 * Send email via Resend HTTP API
 */
const sendViaResend = async (to, subject, html) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  
  console.log(`Attempting to send email via RESEND to: ${to}...`);

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
      console.log("Resend Email sent successfully:", data.id);
      return { success: true, info: data };
    } else {
      console.error("Resend API Error:", data);
      return { success: false, error: new Error(data.message || "Resend API failure") };
    }
  } catch (error) {
    console.error("Resend Fetch Error:", error);
    return { success: false, error };
  }
};

/**
 * Send a password reset email with a system-generated password.
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
        <p>If you did not request this, please contact support or ignore this email if you can still log in with your old password.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #64748b;">This is an automated message. Please do not reply.</p>
      </div>
    `;

  // Try SMTP first (Best deliverability for @gmail.com sender)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      console.log(`Attempting to send reset email via SMTP to: ${email}...`);
      const mailOptions = {
        from: `"SafetyWatch" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        html,
      };
      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully via SMTP. Message ID:", info.messageId);
      return { success: true, info };
    } catch (error) {
      console.error("SMTP failed, attempting fallback to API providers...", error);
    }
  }

  // Try Brevo fallback
  if (process.env.BREVO_API_KEY) {
    const res = await sendViaBrevo(email, subject, html);
    if (res.success) return res;
    console.warn("Brevo failed, attempting next fallback...");
  }

  // Try Resend fallback
  if (process.env.RESEND_API_KEY) {
    const res = await sendViaResend(email, subject, html);
    if (res.success) return res;
    console.warn("Resend failed.");
  }

  return { success: false, error: new Error("All email providers failed") };
};
  


/**
 * Send an OTP email for registration verification.
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

  // Try SMTP first (Best deliverability for @gmail.com sender)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      console.log(`Attempting to send OTP email via SMTP to: ${email}...`);
      const mailOptions = {
        from: `"SafetyWatch" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        html,
      };
      const info = await transporter.sendMail(mailOptions);
      console.log("OTP Email sent successfully via SMTP. Message ID:", info.messageId);
      return { success: true, info };
    } catch (error) {
      console.error("SMTP failed, attempting fallback to API providers...", error);
    }
  }

  // Try Brevo fallback
  if (process.env.BREVO_API_KEY) {
    const res = await sendViaBrevo(email, subject, html);
    if (res.success) return res;
    console.warn("Brevo OTP failed, attempting next fallback...");
  }

  // Try Resend fallback
  if (process.env.RESEND_API_KEY) {
    const res = await sendViaResend(email, subject, html);
    if (res.success) return res;
    console.warn("Resend OTP failed.");
  }

  return { success: false, error: new Error("All email providers failed") };
};
  

