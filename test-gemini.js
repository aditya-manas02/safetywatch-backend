import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ No API KEY found in .env");
  process.exit(1);
}

console.log("🔑 Testing with API Key starting with:", apiKey.substring(0, 10) + "...");

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName, apiVersion) {
  console.log(`\n🤖 Testing Model: ${modelName} (Version: ${apiVersion || "default"})`);
  try {
    const config = { model: modelName };
    if (apiVersion) config.apiVersion = apiVersion;
    
    const model = genAI.getGenerativeModel(config, { apiVersion });
    const result = await model.generateContent("Hello, are you working?");
    const response = await result.response;
    console.log(`✅ SUCCESS! Response: ${response.text()}`);
    return true;
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log("🚀 Starting Gemini API Diagnostics...");
  
  // Test 1: gemini-1.5-flash with default version
  await testModel("gemini-1.5-flash");

  // Test 2: gemini-1.5-flash with v1beta
  await testModel("gemini-1.5-flash", "v1beta");

  // Test 3: gemini-pro (older model)
  await testModel("gemini-pro");
  
  // Test 4: gemini-1.0-pro (another alias)
  await testModel("gemini-1.0-pro");
}

runTests();
