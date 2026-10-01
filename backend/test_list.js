import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
async function test() {
  console.log("Listing models...");
  try {
     // We can't list models using the SDK directly sometimes, but let's try fetch
     const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
     const data = await res.json();
     if(data.models) {
         console.log(data.models.map(m => m.name));
     } else {
         console.log(data);
     }
  } catch(e) {
     console.error(e.message);
  }
}
test();
