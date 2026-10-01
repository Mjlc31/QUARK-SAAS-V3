import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
    const chat = model.startChat({
        systemInstruction: "Retorne um JSON puro com { \"message\": \"...\" }",
        generationConfig: {
            responseMimeType: 'application/json'
        }
    });
    const result = await chat.sendMessage("Teste");
    console.log(result.response.text());
  } catch (err) {
    console.error(err.message);
  }
}
test();
