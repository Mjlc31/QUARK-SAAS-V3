import { GoogleGenAI } from "@google/genai";

// Initialize the Google GenAI client according to coding guidelines.
// The API key must be obtained exclusively from process.env.API_KEY.
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });