import React, { useState, useEffect } from 'react';
import { X, Building2, Save, Image as ImageIcon, Plus, Trash2, Sun } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { mergeSettings } from '@/lib/defaults';
import { Button, Input, Field, ImageField } from '@/components/ui';
import { toast } from 'react-hot-toast';


export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState(() => mergeSettings(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<'empresa' | 'equipamentos'>('empresa');


  useEffect(() => {
    supabase.from('settings').select('data').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data?.data) {
        setSettings(mergeSettings(data.data));
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase.from('settings').upsert({ id: 1, data: settings });
      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  }

  function update(key: keyof typeof settings, value: any) {
    setSettings(s => ({ ...s, [key]: value }));
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Configurações da Empresa</h2>
              <p className="text-sm text-zinc-400">Dados que aparecerão no PDF de propostas</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        
        <div className="flex border-b border-white/10 px-5 bg-zinc-900/50">
          <button onClick={() => setActiveTab('empresa')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'empresa' ? 'border-lime-400 text-lime-400' : 'border-transparent text-zinc-400 hover:text-white'}`}>Dados da Empresa</button>
          <button onClick={() => setActiveTab('equipamentos')} className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'equipamentos' ? 'border-lime-400 text-lime-400' : 'border-transparent text-zinc-400 hover:text-white'}`}>Fotos de Equipamentos</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'empresa' && (
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Nome da Empresa">
                <Input value={settings.company_name} onChange={e => update('company_name', e.target.value)} placeholder="Ex: Quark Energia" />
              </Field>
              <Field label="CNPJ">
                <Input value={settings.cnpj} onChange={e => update('cnpj', e.target.value)} placeholder="Ex: 00.000.000/0001-00" />
              </Field>
              
              <Field label="Telefone Comercial">
                <Input value={settings.phone} onChange={e => update('phone', e.target.value)} placeholder="Ex: (00) 0000-0000" />
              </Field>
              <Field label="E-mail de Contato">
                <Input value={settings.email} onChange={e => update('email', e.target.value)} placeholder="Ex: contato@empresa.com" />
              </Field>

              <Field label="Endereço Completo" className="sm:col-span-2">
                <Input value={settings.address} onChange={e => update('address', e.target.value)} placeholder="Ex: Av. Principal, 1000 - Bairro, Cidade - UF" />
              </Field>

              <Field label="Nome do Vendedor (Padrão)">
                <Input value={settings.seller_name} onChange={e => update('seller_name', e.target.value)} placeholder="Sua Equipe Comercial" />
              </Field>
              <Field label="Responsável Técnico (Engenheiro)">
                <Input value={settings.tech_name} onChange={e => update('tech_name', e.target.value)} placeholder="Nome do Responsável" />
              </Field>

              <Field label="Logo da Empresa (URL)" className="sm:col-span-2">
                <div className="flex gap-3">
                  {settings.logo_url && (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-800">
                      <img src={settings.logo_url} alt="Logo" className="max-h-8 max-w-8 object-contain" />
                    </div>
                  )}
                  <Input className="flex-1" value={settings.logo_url} onChange={e => update('logo_url', e.target.value)} placeholder="https://..." />
                </div>
              </Field>
            </div>
          )}

          {activeTab === 'equipamentos' && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Banco de Imagens</h3>
                  <p className="text-sm text-zinc-400">Cadastre fotos para suas marcas. Elas serão puxadas automaticamente na proposta.</p>
                </div>
                <Button variant="secondary" onClick={() => update('equipment_brands', [...(settings.equipment_brands || []), { id: Date.now().toString(), type: 'module', brand: '', imageUrl: '' }])}>
                  <Plus className="h-4 w-4" /> Nova Marca
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {(settings.equipment_brands || []).map((eb, idx) => (
                  <div key={eb.id} className="relative rounded-xl border border-white/10 bg-zinc-800/50 p-4 pt-8">
                    <button onClick={() => update('equipment_brands', settings.equipment_brands!.filter(x => x.id !== eb.id))} className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-rose-400"><Trash2 className="h-4 w-4"/></button>
                    <div className="flex gap-3 mb-3">
                      <select value={eb.type} onChange={e => { const arr = [...settings.equipment_brands!]; arr[idx].type = e.target.value as 'module'|'inverter'; update('equipment_brands', arr); }} className="bg-zinc-900 border border-white/10 rounded-lg px-2 text-sm text-white">
                        <option value="module">Placa</option>
                        <option value="inverter">Inversor</option>
                      </select>
                      <Input placeholder="Nome da Marca (ex: Jinko)" value={eb.brand} onChange={e => { const arr = [...settings.equipment_brands!]; arr[idx].brand = e.target.value; update('equipment_brands', arr); }} className="flex-1" />
                    </div>
                    <ImageField value={eb.imageUrl} onChange={(v: string) => { const arr = [...settings.equipment_brands!]; arr[idx].imageUrl = v; update('equipment_brands', arr); }} folder="equipamentos" label="Foto real do equipamento" aspect="aspect-[16/10]" />
                  </div>
                ))}
                {(!settings.equipment_brands || settings.equipment_brands.length === 0) && (
                  <div className="col-span-2 py-10 text-center text-zinc-500">Nenhuma marca cadastrada.</div>
                )}
              </div>
            </div>
          )}
        </div>
<div className="flex items-center justify-end gap-3 p-5 border-t border-white/10 bg-zinc-900/50">
          <Button variant="secondary" onClick={onClose} className="bg-transparent hover:bg-white/5 text-zinc-300">
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving} className="bg-lime-400 text-zinc-900 hover:bg-lime-500">
            <Save className="h-4 w-4" /> Salvar Configurações
          </Button>
        </div>
      </div>
    </div>
  );
}
