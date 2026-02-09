
import dotenv from "dotenv";
import { sendOTPEmail } from "./src/services/emailService.js";

// Load environment variables
dotenv.config();

console.log("---------------------------------------------------------");
console.log("             EMAIL DEBUGGING TOOL");
console.log("---------------------------------------------------------");
console.log(`Current Time: ${new Date().toISOString()}`);
console.log(`Node Environment: ${process.env.NODE_ENV}`);
console.log("\n[CONFIGURATION CHECK]");
console.log(`- BREVO_API_KEY: ${process.env.BREVO_API_KEY ? "✅ Present (" + process.env.BREVO_API_KEY.substring(0, 5) + "...)" : "❌ Missing"}`);
console.log(`- RESEND_API_KEY: ${process.env.RESEND_API_KEY ? "✅ Present" : "❌ Missing"}`);
console.log(`- SMTP_USER: ${process.env.SMTP_USER ? "✅ Present (" + process.env.SMTP_USER + ")" : "❌ Missing"}`);
console.log(`- SMTP_PASS: ${process.env.SMTP_PASS ? "✅ Present" : "❌ Missing"}`);
console.log(`- EMAIL_FROM: ${process.env.EMAIL_FROM || "Not set (Using defaults)"}`);

const TEST_EMAIL = "abb9baa09@gmail.com";
const TEST_OTP = "123456";

console.log("\n[TEST EXECUTION]");
console.log(`Attempting to send OTP (${TEST_OTP}) to: ${TEST_EMAIL}`);

async function runTest() {
  try {
    const startTime = Date.now();
    const result = await sendOTPEmail(TEST_EMAIL, TEST_OTP);
    const duration = Date.now() - startTime;

    console.log(`\n[RESULT] (Time: ${duration}ms)`);
    if (result.success) {
      console.log("✅ SUCCESS: Email sent successfully!");
      if (result.info) {
        console.log("Details:", JSON.stringify(result.info, null, 2));
      }
    } else {
      console.log("❌ FAILURE: Email could not be sent.");
      console.log("Error:", JSON.stringify(result.error || result, null, 2));
    }
  } catch (err) {
    console.error("\n❌ CRITICAL ERROR (Exception caught):");
    console.error(err);
  } finally {
    console.log("\n---------------------------------------------------------");
    process.exit(0);
  }
}

runTest();
