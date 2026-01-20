import { GoogleGenAI } from "@google/genai";

// Use import.meta.env for Vite applications
// Ensure you have VITE_GOOGLE_API_KEY defined in your .env file or Netlify environment variables
// Added optional chaining (?.) to prevent "Cannot read properties of undefined" error
const apiKey = import.meta.env?.VITE_GOOGLE_API_KEY || '';

if (!apiKey) {
  console.warn("⚠️ Google GenAI API Key is missing. Check your VITE_GOOGLE_API_KEY environment variable.");
}

// Initialize safely - use a dummy key if missing to prevent crash on boot, 
// though actual API calls will fail and should be handled in UI.
export const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-to-prevent-crash' });