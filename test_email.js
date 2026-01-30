import { sendPasswordResetEmail } from "./src/services/emailService.js";
import dotenv from "dotenv";

dotenv.config();

async function test() {
    console.log("Starting email test...");
    const email = "adityamanas09@gmail.com"; // User's target test email
    const tempPass = "TEST-1234";
    
    try {
        const result = await sendPasswordResetEmail(email, tempPass);
        if (result) {
            console.log("Test email sent SUCCESSFULLY!");
        } else {
            console.log("Test email FAILED to send. Check console for errors above.");
        }
    } catch (error) {
        console.error("Test script error:", error);
    }
    process.exit();
}

test();
