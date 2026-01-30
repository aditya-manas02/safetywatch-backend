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
  pool: true,
  maxConnections: 5,
  connectionTimeout: 60000,
  greetingTimeout: 60000,
  socketTimeout: 60000,
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
 * Send email via Brevo (Sendinblue) HTTP API
 */
const sendViaBrevo = async (to, subject, html) => {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const fromName = process.env.EMAIL_FROM_NAME || "SafetyWatch";
  
  console.log(`Attempting to send email via BREVO to: ${to}...`);

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
        subject,
        htmlContent: html,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      console.log("Brevo Email sent successfully:", data.messageId);
      return { success: true, info: data };
    } else {
      console.error("Brevo API Error:", data);
      return { success: false, error: new Error(data.message || "Brevo API failure") };
    }
  } catch (error) {
    console.error("Brevo Fetch Error:", error);
    return { success: false, error };
  }
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

  // Try Brevo first if API key is present
  if (process.env.BREVO_API_KEY) {
    return await sendViaBrevo(email, subject, html);
  }

  // Try Resend second if API key is present
  if (process.env.RESEND_API_KEY) {
    return await sendViaResend(email, subject, html);
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("CRITICAL: No email provider configured (Brevo, Resend or SMTP). Email skipped.");
    return { success: false, error: new Error("No mail provider configured") };
  }
  
  console.log(`Attempting to send reset email via SMTP to: ${email}...`);

  const mailOptions = {
    from: `"SafetyWatch" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully. Message ID:", info.messageId);
    return { success: true, info };
  } catch (error) {
    console.error("Detailed Email Send Error:", error);
    return { success: false, error };
  }
};

/**
 * Send an OTP email for registration verification.
 */
export const sendOTPEmail = async (email, otp) => {
  const subject = "SafetyWatch - Verify Your Email";
  const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #2563eb;">Verify Your Email Address</h2>
        <p>Hello,</p>
        <p>Thank you for signing up for SafetyWatch. Please use the following One-Time Password (OTP) to verify your email address. This code is valid for 10 minutes.</p>
        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 32px; font-weight: bold; text-align: center; margin: 24px 0; color: #0f172a; border: 1px solid #e2e8f0; letter-spacing: 4px;">
          ${otp}
        </div>
        <p>If you did not request this, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #64748b;">This is an automated message. Please do not reply.</p>
      </div>
    `;

  // Try Brevo first if API key is present
  if (process.env.BREVO_API_KEY) {
    return await sendViaBrevo(email, subject, html);
  }

  // Try Resend second if API key is present
  if (process.env.RESEND_API_KEY) {
    return await sendViaResend(email, subject, html);
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("CRITICAL: No email provider configured (Brevo, Resend or SMTP). OTP skipped.");
    return { success: false, error: new Error("No mail provider configured") };
  }
  
  console.log(`Attempting to send OTP email via SMTP to: ${email}...`);

  const mailOptions = {
    from: `"SafetyWatch" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("OTP Email sent successfully. Message ID:", info.messageId);
    return { success: true, info };
  } catch (error) {
    console.error("Detailed OTP Email Send Error:", error);
    return { success: false, error };
  }
};
