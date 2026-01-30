/* eslint-disable no-unused-vars */
import axios from "axios";

const BASE_URL = "http://localhost:4000/api/auth";
const TEST_EMAIL = "adityamanas09@gmail.com";

async function testOTPFlow() {
    console.log("--- STARTING OTP FLOW TEST ---");

    try {
        // 1. SIGNUP
        console.log("\n1. Testing Signup...");
        const signupRes = await axios.post(`${BASE_URL}/signup`, {
            email: TEST_EMAIL,
            name: "Test User",
            password: "password123"
        });
        console.log("Signup Response:", signupRes.data.message);

        // 2. TRY LOGIN (should fail)
        console.log("\n2. Testing Login before verification...");
        try {
            await axios.post(`${BASE_URL}/login`, {
                email: TEST_EMAIL,
                password: "password123"
            });
        } catch (err) {
            console.log("Login failed as expected:", err.response.data.message);
        }

        console.log("\n!!! PLEASE CHECK EMAIL FOR OTP AND CALL verify-otp MANUALLY IF NEEDED !!!");
        console.log("Since I cannot read your email, I will stop here. You can verify it manually.");

    } catch (err) {
        console.error("Test Error:", err.response?.data || err.message);
    }
}

// Note: This requires the server to be running.
// testOTPFlow();
console.log("To run this test, make sure the backend is running and uncomment the call.");
