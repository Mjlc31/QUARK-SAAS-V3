import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GOOGLE_AI_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export interface ExtractedInvoice {
  name: string;
  monthlyConsumptionKwh: number;
  tariffRate: number;
}

export async function extractInvoiceData(imageBase64: string, mimeType: string): Promise<ExtractedInvoice> {
  if (!ai) {
    throw new Error('Google AI SDK não inicializado (chave ausente).');
  }

  const prompt = `
  Analise esta fatura de energia elétrica (ex: Equatorial). 
  Extraia EXATAMENTE as seguintes informações em formato JSON, e apenas JSON válido, sem markdown:
  {
    "name": "Nome do cliente impresso na fatura",
    "monthlyConsumptionKwh": Consumo faturado no mês (em kWh, apenas número inteiro),
    "tariffRate": O valor da tarifa (TE + TUSD) em R$/kWh (apenas número flutuante com ponto)
  }
  Se não conseguir encontrar algo, use valores razoáveis ou 0/nulos, mas mantenha a estrutura JSON.
  `;

  // Remove the data URL prefix if present
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType } }
        ]
      }
    ]
  });

  const text = response.text || '';
  
  // Parse JSON
  try {
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(jsonStr);
    return {
      name: data.name || 'Cliente Extraído OCR',
      monthlyConsumptionKwh: Number(data.monthlyConsumptionKwh) || 0,
      tariffRate: Number(data.tariffRate) || 0,
    };
  } catch (error) {
    console.error("Failed to parse OCR response:", text);
    throw new Error('Falha ao processar o resultado da IA.');
  }
}
