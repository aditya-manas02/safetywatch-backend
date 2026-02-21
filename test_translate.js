import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config({ path: "d:\\safe-neighborhood-watch-main11\\.env" });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("No API key");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const MODELS = [
  "models/gemini-1.5-flash",
  "models/gemini-pro"
];

async function testSingle() {
    for (const m of MODELS) {
        try {
            console.log("Trying", m);
            const model = genAI.getGenerativeModel({ model: m });
            const prompt = `You are a professional translator specialized in the Indian region. 
            Translate the following text accurately into Marathi (मराठी). 

            Requirements:
            1. Maintain the original tone and intent.
            2. Use natural, conversational language commonly spoken in India (avoid overly formal words).
            3. Ensure Indian regional context is respected.
            4. Return ONLY the translated text.
              
            Text: "Hello world this is a test"`;

            const result = await model.generateContent(prompt);
            console.log("SINGLE RESPONSE:");
            console.log(result.response.text());
            break;
        } catch(e) { console.error("Failed", e.message.slice(0, 100)); }
    }
}

async function testBatch() {
    for (const m of MODELS) {
        try {
            console.log("Trying", m);
            const model = genAI.getGenerativeModel({ model: m });
            const texts = ["Popular Incidents", "Critical reports verified.", "Neighborhood Watch"];
            const prompt = `You are a professional translator specialized in the Indian region. 
            Translate the following JSON array of strings into Marathi (मराठी).

            Requirements:
            1. Maintain the EXACT same array order and structure.
            2. Use natural, conversational language common in India.
            3. Return ONLY the translated JSON array as a raw string (no markdown blocks).
              
            Strings: ${JSON.stringify(texts)}`;

            const result = await model.generateContent(prompt);
            console.log("\nBATCH RESPONSE:");
            console.log(result.response.text());
            break;
        } catch(e) { console.error("Failed", e.message.slice(0, 100)); }
    }
}

async function run() {
    await testSingle();
    await testBatch();
}
run();
