import { sendPhoneOTP } from './src/services/smsService.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' }); // Adjust to point to root .env if needed

const testPhone = process.argv[2];

if (!testPhone) {
  console.log("Usage: node test_otp_flow.js <phone_number>");
  console.log("Example: node test_otp_flow.js +1234567890");
  process.exit(1);
}

async function test() {
  console.log(`\n--- Twilio OTP Tester ---`);
  console.log(`Target Phone: ${testPhone}`);
  
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const result = await sendPhoneOTP(testPhone, otp);
  
  if (result.success) {
    if (result.simulated) {
      console.log("⚠️  SIMULATION MODE: Twilio credentials missing in .env");
      console.log(`Simulated OTP for ${testPhone}: ${otp}`);
    } else {
      console.log(`✅ SUCCESS! Real SMS sent via Twilio.`);
      console.log(`Message SID: ${result.messageId}`);
    }
  } else {
    console.error(`❌ FAILED: ${result.error}`);
    console.log(`\nCheck that:`);
    console.log(`1. Your TWILIO_ACCOUNT_SID and AUTH_TOKEN are correct in .env`);
    console.log(`2. If on Trial, the number ${testPhone} is a 'Verified Caller ID' in Twilio.`);
  }
}

test();

