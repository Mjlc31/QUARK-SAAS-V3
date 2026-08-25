export interface ExtractedInvoice {
  name: string;
  monthlyConsumptionKwh: number;
  tariffRate: number;
}

export async function extractInvoiceData(imageBase64: string, mimeType: string): Promise<ExtractedInvoice> {
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  const response = await fetch('/api/ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ imageBase64: base64Data, mimeType })
  });

  if (!response.ok) {
    throw new Error('Falha ao processar a imagem no servidor.');
  }

  const data = await response.json();
  return {
    name: data.name || 'Cliente Extraído OCR',
    monthlyConsumptionKwh: Number(data.monthlyConsumptionKwh) || 0,
    tariffRate: Number(data.tariffRate) || 0,
  };
}
