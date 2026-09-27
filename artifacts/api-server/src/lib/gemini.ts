/**
 * Gemini AI client — uses the free Google Generative AI API.
 * Requires GEMINI_API_KEY environment variable (free from Google AI Studio).
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * Run a prompt through Gemini Flash.
 * Returns null if no API key is configured.
 */
export async function geminiPrompt(prompt: string): Promise<string | null> {
  if (!genAI) return null;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    console.error("Gemini evaluation failed:", e instanceof Error ? e.message : "unknown provider error");
    return null;
  }
}

/**
 * Parse JSON from a Gemini response — strips markdown code fences if present.
 */
export function parseGeminiJson<T>(text: string): T | null {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
