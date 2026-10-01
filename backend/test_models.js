import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const genAI = new GoogleGenerativeAI(process.env.VITE_GOOGLE_AI_KEY);
async function test() {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  console.log("Try VITE_GOOGLE_AI_KEY");
  try {
     const result = await model.generateContent('Hi');
     console.log(result.response.text());
  } catch(e) {
     console.error(e.message);
  }
}
test();
