import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY?.trim();
const genAI = new GoogleGenerativeAI(apiKey);

const texts = ["Hello", "Robbery reported"];
const targetLanguage = "mr";

const prompt = `Translate this JSON array of strings into ${targetLanguage}. 
Maintain the EXACT same array order and structure. 
Respect local Indian context. 
Return ONLY the translated JSON array, with no extra text or markdown.

Strings: ${JSON.stringify(texts)}`;

async function runTest() {
  const MODELS_TO_TRY = ["gemini-pro", "gemini-1.5-flash"];
  for (const modelName of MODELS_TO_TRY) {
    console.log("Trying", modelName);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      console.log("Response text:", text);
      
      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');
      
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket >= firstBracket) {
        text = text.substring(firstBracket, lastBracket + 1);
      } else {
        throw new Error("No JSON array returned by model");
      }

      const parsed = JSON.parse(text);
      console.log("Success:", parsed);
      return;
    } catch (e) {
      console.error(modelName, "Failed:", e);
    }
  }
}

runTest();
