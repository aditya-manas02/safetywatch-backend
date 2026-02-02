/**
 * Simulated SMS Service for SafetyWatch
 * In production, this would integrate with Twilio, MessageBird, or AWS SNS.
 */

export const sendSMS = async (phone, message) => {
  try {
    // Basic validation
    if (!phone || !message) {
      throw new Error("Phone number and message are required");
    }

    console.log("\n--- [SMS SIMULATOR] ---");
    console.log(`TO: ${phone}`);
    console.log(`MESSAGE: ${message}`);
    console.log("--- [END SIMULATOR] ---\n");

    // Simulate 500ms network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return { success: true, messageId: `msg_${Math.random().toString(36).slice(2, 11)}` };
  } catch (error) {
    console.error("[SMS SERVICE ERROR]:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send a 6-digit OTP via simulated SMS
 */
export const sendPhoneOTP = async (phone, otp) => {
  const message = `Your SafetyWatch verification code is: ${otp}. Valid for 10 minutes.`;
  return await sendSMS(phone, message);
};
