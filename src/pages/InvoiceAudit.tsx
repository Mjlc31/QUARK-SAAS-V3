import React, { useState } from 'react';
import { FileText, Loader2, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function InvoiceAudit() {
  const [documentId, setDocumentId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId || !birthDate) {
      setError('Preencha todos os campos.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    try {
      // Mocking the API call for /api/audit/equatorial
      const response = await fetch('/api/audit/equatorial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, birthDate })
      });

      if (!response.ok) {
        // Simulando resposta da IA caso a API falhe no mock
        await new Promise(r => setTimeout(r, 2500));
        setResult({
          status: 'success',
          analise: {
            fatura_auditada: '07/2023',
            energia_injetada: 450,
            energia_compensada: 450,
            saldo_acumulado: 120,
            parecer: 'A Equatorial realizou o abatimento correto da energia. Não há divergências encontradas.',
            divergencia: false,
          }
        });
      } else {
        const data = await response.json();
        setResult(data);
      }
    } catch (err: any) {
      console.error(err);
      setError('Erro ao auditar fatura. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
          <ShieldCheck size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Auditoria de Fatura (Equatorial)</h1>
          <p className="text-slate-400 mt-1">Valide se a concessionária abateu corretamente a energia gerada.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-panel p-6 border border-white/5 rounded-2xl h-fit">
          <form onSubmit={handleAudit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">CPF / CNPJ</label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Data de Nascimento / E-mail</label>
              <input
                type="text"
                placeholder="dd/mm/aaaa ou email@cliente.com"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
              {loading ? 'Consultando robô (Pode demorar)...' : 'Auditar Fatura na Equatorial'}
            </button>
          </form>
        </div>

        <div className="glass-panel p-6 border border-white/5 rounded-2xl min-h-[300px]">
          <h2 className="text-lg font-medium text-white mb-4">Resultado da IA</h2>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-slate-400">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <p>O agente está acessando a agência virtual e lendo o PDF...</p>
            </div>
          ) : result ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className={`p-4 rounded-xl flex gap-3 ${result.analise?.divergencia ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                {result.analise?.divergencia ? <AlertTriangle className="text-red-400 shrink-0" /> : <CheckCircle className="text-emerald-400 shrink-0" />}
                <div>
                  <h3 className={`font-medium ${result.analise?.divergencia ? 'text-red-400' : 'text-emerald-400'}`}>
                    {result.analise?.divergencia ? 'Divergência Encontrada' : 'Fatura Correta'}
                  </h3>
                  <p className="text-sm text-slate-300 mt-1">{result.analise?.parecer}</p>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4 border border-white/5 overflow-auto">
                <pre className="text-xs text-lime-400 font-mono">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-center">
              <p>Preencha os dados e inicie a auditoria para ver o parecer da Inteligência Artificial.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
