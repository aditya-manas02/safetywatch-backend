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
  const apiKey = (process.env.BREVO_API_KEY || "").trim();
  const fromEmail = process.env.EMAIL_FROM || "safetywatch4neighbour@gmail.com";
  const fromName = process.env.EMAIL_FROM_NAME || "SafetyWatch";
  
  const keyDiagnostics = {
    exists: !!apiKey,
    length: apiKey.length,
    prefix: apiKey ? `${apiKey.substring(0, 8)}...` : "none",
    suffix: apiKey ? `...${apiKey.substring(apiKey.length - 4)}` : "none"
  };

  console.log(`[BREVO DIAG] Attempting to send. Key exists: ${keyDiagnostics.exists}, Length: ${keyDiagnostics.length}, Prefix: ${keyDiagnostics.prefix}`);
  console.log(`[BREVO DIAG] From: ${fromEmail}, To: ${to}`);

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
      console.log("[BREVO SUCCESS] Email sent:", data.messageId);
      return { success: true, info: data };
    } else {
      console.error("[BREVO API ERROR]", JSON.stringify(data));
      let helpfulMessage = data.message || "Brevo failure";
      if (helpfulMessage.includes("Key not found") || helpfulMessage.includes("unauthorized")) {
        helpfulMessage = `Brevo API Key REJECTED. Please check your Render Environment Variables. (Key Prefix: ${keyDiagnostics.prefix})`;
      }
      return { success: false, error: { message: helpfulMessage, details: data } };
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
