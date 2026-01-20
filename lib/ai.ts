import { GoogleGenAI } from "@google/genai";

// Use import.meta.env for Vite applications
// You must define VITE_GOOGLE_API_KEY in your .env file or Netlify Environment Variables
const apiKey = import.meta.env?.VITE_GOOGLE_API_KEY;

// Fallback logic for the AI Service
if (!apiKey) {
  console.warn("⚠️ Google GenAI: 'VITE_GOOGLE_API_KEY' não encontrada. As funcionalidades de IA (CRM/Chat) podem falhar.");
}

// Initialize safely. If no key is present, use a placeholder to prevent app crash on load.
// Real calls will fail gracefully in the UI if the key is invalid.
export const ai = new GoogleGenAI({ apiKey: apiKey || 'missing-api-key' });