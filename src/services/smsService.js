/**
 * SMS Service for SafetyWatch using Twilio
 */
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client only if credentials exist
let client;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

export const sendSMS = async (phone, message) => {
  try {
    // Basic validation
    if (!phone || !message) {
      throw new Error("Phone number and message are required");
    }

    if (!client) {
      console.warn("\n--- [SMS SIMULATOR (Missing Twilio Config)] ---");
      console.log(`TO: ${phone}`);
      console.log(`MESSAGE: ${message}`);
      console.log("--- [END SIMULATOR] ---\n");
      return { success: true, simulated: true, messageId: `msg_sim_${Math.random().toString(36).slice(2, 11)}` };
    }

    const response = await client.messages.create({
      body: message,
      from: twilioPhone,
      to: phone
    });

    console.log(`[SMS SENT]: ${response.sid}`);
    return { success: true, messageId: response.sid };
  } catch (error) {
    console.error("[SMS SERVICE ERROR]:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send a 6-digit OTP via SMS
 */
export const sendPhoneOTP = async (phone, otp) => {
  const message = `Your SafetyWatch verification code is: ${otp}. Valid for 10 minutes.`;
  return await sendSMS(phone, message);
};

