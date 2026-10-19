import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_AI_KEY;

let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

/**
 * Processa uma fatura de energia em imagem/PDF base64 usando o modelo Gemini 2.5 Flash
 * com extração estrita em formato JSON.
 * @param {string} base64Data - Imagem em base64 (com ou sem prefixo data:image/...)
 * @param {string} mimeType - MIME type da imagem (padrão 'image/jpeg')
 * @returns {Promise<object>} Dados estruturados da fatura de energia
 */
export async function parseEnergyBillOCR(base64Data, mimeType = 'image/jpeg') {
  if (!base64Data) {
    throw new Error('Nenhuma imagem base64 fornecida para o OCR');
  }

  const cleanBase64 = String(base64Data).replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '').trim();

  // Se a chave não estiver configurada, retorna dados sintéticos realistas para desenvolvimento local
  if (!genAI) {
    console.warn('[GEMINI OCR] Chave de API não configurada. Utilizando fallback simulado.');
    return {
      client_name: 'Cliente Extraído OCR (Modo Demonstração)',
      document_cpf_cnpj: '123.456.789-00',
      utility_company: 'Equatorial Energia Alagoas',
      installation_code: '849201948',
      reference_month: '09/2026',
      consumption_kwh: 520,
      injected_energy_kwh: 480,
      tariff_rate: 0.98,
      amount_brl: 45.80,
      solar_savings_brl: 470.40,
      due_date: '2026-10-20',
      is_fallback: true,
    };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `Você é um especialista em auditoria de faturas de energia elétrica brasileiras (Equatorial, Enel, CPFL, Cemig, Copel, Energisa).
Analise detalhadamente a imagem da fatura fornecida e extraia exatamente os seguintes campos em JSON:
{
  "client_name": "Nome completo do titular ou razão social",
  "document_cpf_cnpj": "CPF ou CNPJ do titular (apenas números ou formatado)",
  "utility_company": "Nome da concessionária distribuidora de energia",
  "installation_code": "Código da instalação / número da conta contrato / código do cliente",
  "reference_month": "Mês de referência no formato MM/AAAA (ex: 09/2026)",
  "consumption_kwh": número decimal ou inteiro com o consumo total medido do mês em kWh,
  "injected_energy_kwh": número decimal ou inteiro com a energia injetada / energia compensada solar no mês em kWh (se houver, caso contrário 0),
  "tariff_rate": número decimal com a tarifa de energia com impostos (R$/kWh, ex: 0.95),
  "amount_brl": número decimal com o valor total líquido a pagar nesta fatura (ex: 85.50),
  "solar_savings_brl": número decimal com a economia estimada proporcionada pela energia solar gerada no mês (se houver, ex: 450.00),
  "due_date": "Data de vencimento no formato AAAA-MM-DD"
}
Retorne exclusivamente o JSON puro.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: cleanBase64,
          mimeType: mimeType || 'image/jpeg',
        },
      },
    ]);

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    return {
      client_name: parsed.client_name || 'Cliente Extraído OCR',
      document_cpf_cnpj: parsed.document_cpf_cnpj || '',
      utility_company: parsed.utility_company || 'Distribuidora de Energia',
      installation_code: parsed.installation_code || '',
      reference_month: parsed.reference_month || new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
      consumption_kwh: Number(parsed.consumption_kwh) || 0,
      injected_energy_kwh: Number(parsed.injected_energy_kwh) || 0,
      tariff_rate: Number(parsed.tariff_rate) || 0.95,
      amount_brl: Number(parsed.amount_brl) || 0,
      solar_savings_brl: Number(parsed.solar_savings_brl) || 0,
      due_date: parsed.due_date || new Date().toISOString().split('T')[0],
      is_fallback: false,
    };
  } catch (error) {
    console.error('[GEMINI OCR] Erro ao analisar imagem:', error.message);
    // Fallback defensivo
    return {
      client_name: 'Cliente Extraído OCR',
      document_cpf_cnpj: '',
      utility_company: 'Equatorial Energia',
      installation_code: '',
      reference_month: '09/2026',
      consumption_kwh: 450,
      injected_energy_kwh: 400,
      tariff_rate: 0.95,
      amount_brl: 52.30,
      solar_savings_brl: 380.00,
      due_date: new Date().toISOString().split('T')[0],
      is_fallback: true,
      error_note: error.message,
    };
  }
}

export default {
  parseEnergyBillOCR,
};
