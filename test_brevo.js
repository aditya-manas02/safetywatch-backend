// Test Brevo Email Configuration
// Run: node test_brevo.js

import dotenv from "dotenv";
dotenv.config();

const testBrevoSender = async () => {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromEmail = process.env.SMTP_USER || "safetywatch4neighbour@gmail.com";

  console.log("🔍 Testing Brevo Configuration...\n");
  console.log("API Key:", apiKey ? "✅ Found" : "❌ Missing");
  console.log("Sender Email:", fromEmail);
  console.log("\n📧 Checking sender verification status...\n");

  try {
    // Check sender verification
    const response = await fetch("https://api.brevo.com/v3/senders", {
      method: "GET",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
      },
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ Brevo API Connection Successful!\n");
      console.log("Verified Senders:");
      data.senders?.forEach(sender => {
        console.log(`  - ${sender.email} (${sender.name}) - Active: ${sender.active}`);
      });

      const isVerified = data.senders?.some(s => s.email === fromEmail && s.active);
      
      if (isVerified) {
        console.log(`\n✅ ${fromEmail} is VERIFIED and ready to send!`);
      } else {
        console.log(`\n⚠️  ${fromEmail} is NOT verified in Brevo.`);
        console.log("\n📋 To fix this:");
        console.log("1. Go to: https://app.brevo.com/settings/senders");
        console.log("2. Add and verify:", fromEmail);
        console.log("3. Check your email for verification link");
      }
    } else {
      console.error("❌ Brevo API Error:", data);
    }
  } catch (error) {
    console.error("❌ Connection Error:", error.message);
  }

  // Test sending to a sample email
  console.log("\n\n📤 Testing email send to Yahoo (common failure case)...\n");
  
  try {
    const testResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { name: "SafetyWatch", email: fromEmail },
        to: [{ email: "test@yahoo.com" }], // Test Yahoo delivery
        subject: "SafetyWatch Test Email",
        htmlContent: "<h1>Test Email</h1><p>If you receive this, Brevo is working!</p>",
      }),
    });

    const testData = await testResponse.json();
    
    if (testResponse.ok) {
      console.log("✅ Test email queued successfully!");
      console.log("Message ID:", testData.messageId);
    } else {
      console.error("❌ Test email failed:", testData);
    }
  } catch (error) {
    console.error("❌ Test send error:", error.message);
  }
};

testBrevoSender();
