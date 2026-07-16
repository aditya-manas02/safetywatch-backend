import dotenv from "dotenv";
dotenv.config();

/**
 * Sends an SOS alert SMS via Twilio to a list of emergency contacts.
 * Uses native fetch to avoid adding the twilio npm dependency.
 */
export const sendSOSMessage = async (contacts, user, locationLink) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log("[SMS] Twilio credentials missing, skipping SMS/WhatsApp delivery.");
    return { success: false, error: "Missing Twilio credentials" };
  }

  const message = `🚨 EMERGENCY SOS 🚨
User ${user.name} has triggered an SOS alert!
Location: ${locationLink || 'Not provided'}
Please check on them immediately or call emergency services if required!`;

  const results = [];
  const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  for (const contact of contacts) {
    if (!contact.phone) continue;
    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: contact.phone,
          From: fromNumber,
          Body: message
        }).toString()
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`[SMS] Delivered to ${contact.phone}`);
        results.push({ success: true, contact: contact.phone, sid: data.sid });
      } else {
        console.error(`[SMS] Failed to deliver to ${contact.phone}`, data);
        results.push({ success: false, contact: contact.phone, error: data.message });
      }
    } catch (error) {
      console.error(`[SMS] Error delivering to ${contact.phone}:`, error.message);
      results.push({ success: false, contact: contact.phone, error: error.message });
    }
  }

  return { success: true, results };
};

/**
 * Sends a "Marked as Safe" SMS via Twilio to emergency contacts.
 */
export const sendSOSSafeMessage = async (contacts, user) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) return;

  const message = `✅ SOS RESOLVED ✅
User ${user.name} has marked their SOS alert as SAFE.
They no longer require immediate assistance.`;

  const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  for (const contact of contacts) {
    if (!contact.phone) continue;
    try {
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: contact.phone,
          From: fromNumber,
          Body: message
        }).toString()
      });
    } catch (error) {
      console.error(`[SMS] Safe message error for ${contact.phone}:`, error.message);
    }
  }
};
