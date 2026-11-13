// Supabase falso em memória (tabelas + Storage) para testes de rota e E2E. signedUrlBase: onde os arquivos são servidos.
export function fakeDb(seed, { signedUrlBase = 'https://signed' } = {}) {
  const tables = structuredClone(seed);
  const files = new Map();
  let seq = 0;
  const from = (name) => {
    const rows = (tables[name] ||= []);
    let filters = [], op = 'select', payload = null;
    const match = (r) => filters.every(([k, v]) => (v === null ? r[k] == null : r[k] === v));
    const run = () => {
      if (op === 'insert') {
        const list = (Array.isArray(payload) ? payload : [payload]).map((p) => {
          const row = { id: `id-${++seq}`, token: `tok-${seq}`, created_at: new Date().toISOString(), ...p };
          if (name === 'generated_contracts') row.version = rows.filter((r) => r.proposal_id === p.proposal_id).length + 1;
          rows.push(row);
          return row;
        });
        return list;
      }
      const found = rows.filter(match);
      if (op === 'update') found.forEach((r) => Object.assign(r, payload));
      return found;
    };
    const q = {
      select: () => q, order: () => q,
      eq: (k, v) => { filters.push([k, v]); return q; },
      is: (k, v) => { filters.push([k, v]); return q; },
      insert: (p) => { op = 'insert'; payload = p; return q; },
      update: (p) => { op = 'update'; payload = p; return q; },
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      single: async () => { const r = run()[0]; return r ? { data: r, error: null } : { data: null, error: new Error('no rows') }; },
      then: (res, rej) => Promise.resolve({ data: run(), error: null }).then(res, rej),
    };
    return q;
  };
  const storage = {
    from: (bucket) => ({
      upload: async (path, buf) => (files.has(`${bucket}/${path}`) ? { error: new Error('exists') } : (files.set(`${bucket}/${path}`, buf), { data: { path }, error: null })),
      download: async (path) => ({ data: new Blob([files.get(`${bucket}/${path}`)]), error: null }),
      createSignedUrl: async (path, ttl, opts) => ({ data: { signedUrl: `${signedUrlBase}/${bucket}/${path}?ttl=${ttl}&dl=${encodeURIComponent(opts.download)}` }, error: null }),
    }),
  };
  return { client: { from, storage }, tables, files };
}
