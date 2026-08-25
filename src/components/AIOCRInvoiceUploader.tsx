import React, { useRef, useState } from 'react';
import { Upload, Loader2, Sparkles } from 'lucide-react';
import { extractInvoiceData, ExtractedInvoice } from '../services/aiOcrService';

interface AIOCRInvoiceUploaderProps {
  onSuccess: (data: ExtractedInvoice) => void;
}

export const AIOCRInvoiceUploader: React.FC<AIOCRInvoiceUploaderProps> = ({ onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const extracted = await extractInvoiceData(base64String, file.type);
          onSuccess(extracted);
        } catch (err) {
          console.error(err);
          alert('Erro ao processar fatura pela IA. Tente novamente ou insira manualmente.');
        } finally {
          setIsProcessing(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-blue-500/30 text-blue-400 font-bold rounded-xl transition-all disabled:opacity-50"
      >
        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
        {isProcessing ? 'Lendo Fatura...' : 'Triage por IA (Fatura)'}
      </button>
    </div>
  );
};
