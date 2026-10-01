import React, { useState } from 'react';
import { X, UserPlus, Save } from 'lucide-react';
import { Button, Input, Field } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';

export function NewLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [formData, setFormData] = useState({ title: '', phone: '', city: '' });
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!formData.title) {
      toast.error("O nome do cliente é obrigatório");
      return;
    }
    setLoading(true);
    try {
      const newOpp = {
        title: formData.title,
        phone: formData.phone,
        city: formData.city,
        status: 'Proposta', // goes to Proposta column
        amount: 0,
      };
      const { data, error } = await supabase().from('opportunities').insert([newOpp]).select();
      if (error) throw error;
      if (data && data[0]) {
        toast.success("Cliente criado com sucesso!");
        onCreated(data[0].id);
        onClose();
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao criar cliente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Novo Cliente (CRM)</h2>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 grid gap-5">
          <Field label="Nome do Cliente / Projeto *">
            <Input autoFocus value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: João da Silva" />
          </Field>
          <Field label="Telefone / WhatsApp">
            <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" />
          </Field>
          <Field label="Cidade">
            <Input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="Ex: São Paulo" />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-white/10 bg-zinc-900/50">
          <Button variant="secondary" onClick={onClose} className="bg-transparent hover:bg-white/5 text-zinc-300">
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={loading} className="bg-lime-400 text-zinc-900 hover:bg-lime-500">
            <Save className="h-4 w-4" /> Cadastrar Cliente
          </Button>
        </div>
      </div>
    </div>
  );
}
