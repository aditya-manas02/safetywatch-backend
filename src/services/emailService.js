import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  logger: true, // Shows detailed logs in Render console
  debug: true,  // Shows SMTP traffic
});

// Verify connection configuration on startup
transporter.verify((error, _success) => {
  if (error) {
    console.error("SMTP Connection Error Details:", error);
  } else {
    console.log("SMTP Server is ready to take our messages");
  }
});

/**
 * Send a password reset email with a system-generated password.
 */
export const sendPasswordResetEmail = async (email, newPassword) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("CRITICAL: SMTP credentials missing in .env (SMTP_USER/SMTP_PASS). Email skipped.");
    return false;
  }
  
  console.log(`Attempting to send reset email to: ${email} from ${process.env.SMTP_USER}...`);

  const mailOptions = {
    from: `"SafetyWatch" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "SafetyWatch - Your Password has been Reset",
    html: `
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
    `,
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
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("CRITICAL: SMTP credentials missing in .env (SMTP_USER/SMTP_PASS). OTP skipped.");
    return false;
  }
  
  console.log(`Attempting to send OTP email to: ${email} from ${process.env.SMTP_USER}...`);

  const mailOptions = {
    from: `"SafetyWatch" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "SafetyWatch - Verify Your Email",
    html: `
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
    `,
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
