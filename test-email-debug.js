import { sendOTPEmail } from "./src/services/emailService.js";
import dotenv from "dotenv";

dotenv.config();

async function testEmail() {
  const targetEmail = process.env.SUPERADMIN_EMAIL || "test@example.com";
  console.log(`Starting Email Test to: ${targetEmail}`);
  console.log("Checking Environment Variables:");
  console.log("BREVO_API_KEY present:", !!process.env.BREVO_API_KEY);
  console.log("SMTP_USER present:", !!process.env.SMTP_USER);
  console.log("SMTP_PASS present:", !!process.env.SMTP_PASS);
  console.log("---------------------------------------------------");

  const result = await sendOTPEmail(targetEmail, "123456");

  console.log("---------------------------------------------------");
  console.log("Test Result:");
  if (result.success) {
    console.log("✅ Email sent successfully!");
    console.log("Provider Info:", JSON.stringify(result.info, null, 2));
  } else {
    console.error("❌ Email FAILED completely.");
    console.error("Error:", result.error);
  }
}

testEmail();
