import React, { forwardRef, useState, type ReactNode } from 'react';
import type { QuickQuote } from '../../lib/quick-quote';
import { brl, fmtNum } from '../../lib/quick-quote';

export const STORY_W = 540;
export const STORY_H = 960;

export type Highlight = 'cartao' | 'financiamento' | 'avista';

export interface OfferData {
  client: string;
  city?: string | null;
  headline1: string;
  headline2: string;
  campaign: string;
  moduleW: number;
  moduleBrand: string;
  moduleType: string;
  efficiency: number;
  moduleWarranty: number;
  inverterBrand: string;
  inverterKw: number;
  inverterWarranty: number;
  moduleImage?: string | null;
  inverterImage?: string | null;
  included: string[];
  footer1: string;
  footer2: string;
  highlight: Highlight;
  financingMonths: number;
  cardInstallments: number;
  validityDays: number;
  company: string;
  logoUrl?: string | null;
  seller?: string | null;
  sellerPhone?: string | null;
  number: string;
}

const GRAD_TEXT = (g: string) => ({
  backgroundImage: g,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
}) as const;

/** Foto do produto com fallback elegante para vetor */
function ProductPhoto({ src, fallback, shadow }: { src: string; fallback: ReactNode; shadow: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className="max-h-full max-w-full object-contain"
      style={{ filter: shadow }}
    />
  );
}

/** Placa solar fotovoltaica em vetor de alta precisão */
function PanelArt({ id, className, style }: { id: string; className?: string; style?: React.CSSProperties }) {
  const cols = 6;
  const rows = 12;
  return (
    <svg viewBox="0 0 120 200" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F4F6FA" />
          <stop offset="0.5" stopColor="#A9B2C0" />
          <stop offset="1" stopColor="#E3E7EE" />
        </linearGradient>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#23345A" />
          <stop offset="0.55" stopColor="#101A33" />
          <stop offset="1" stopColor="#070C1C" />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.32" />
          <stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="118" height="198" rx="3" fill={`url(#${id}-f)`} />
      <rect x="5" y="5" width="110" height="190" rx="1.5" fill={`url(#${id}-g)`} />
      {Array.from({ length: cols - 1 }, (_, i) => (
        <line
          key={`c${i}`}
          x1={5 + ((i + 1) * 110) / cols}
          y1="5"
          x2={5 + ((i + 1) * 110) / cols}
          y2="195"
          stroke="#5E7AB0"
          strokeOpacity="0.55"
          strokeWidth="0.6"
        />
      ))}
      {Array.from({ length: rows - 1 }, (_, i) => (
        <line
          key={`r${i}`}
          x1="5"
          y1={5 + ((i + 1) * 190) / rows}
          x2="115"
          y2={5 + ((i + 1) * 190) / rows}
          stroke="#5E7AB0"
          strokeOpacity={i === 5 ? 0.9 : 0.4}
          strokeWidth={i === 5 ? 1.2 : 0.5}
        />
      ))}
      <polygon points="5,5 80,5 5,120" fill={`url(#${id}-s)`} />
    </svg>
  );
}

/** Inversor solar on-grid em vetor moderno */
function InverterArt({ id, brand, className, style }: { id: string; brand: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 130 160" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B9CBE3" />
          <stop offset="0.6" stopColor="#7E97BC" />
          <stop offset="1" stopColor="#5D769C" />
        </linearGradient>
        <linearGradient id={`${id}-h`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="122" height="146" rx="14" fill={`url(#${id}-b)`} />
      <rect x="4" y="4" width="60" height="146" rx="14" fill={`url(#${id}-h)`} />
      {Array.from({ length: 11 }, (_, i) => (
        <line key={i} x1={80 + i * 4} y1="14" x2={70 + i * 4} y2="140" stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="1.2" />
      ))}
      <path d="M48 150 L56 118 Q58 112 64 112 L74 112 Q80 112 82 118 L90 150 Z" fill="#0E0F14" />
      <circle cx="69" cy="122" r="1.8" fill="#9BD373" />
      <text x="14" y="136" fill="#FFFFFF" fontSize="9" fontWeight="700" fontFamily="sans-serif" opacity="0.9">
        {brand.slice(0, 14)}
      </text>
    </svg>
  );
}

/** Selo dourado "Equipamento Premium" */
function Seal({ campaign, className }: { campaign: string; className?: string }) {
  const c = campaign.trim().slice(0, 22);
  return (
    <div
      className={`rounded-[12px] bg-gradient-to-br from-[#F6DE83] via-[#E4B83A] to-[#C98A1E] px-2.5 py-1 text-center text-[#2A1A05] shadow-[0_10px_22px_-6px_rgba(230,180,60,0.75)] ring-1 ring-[#FFF3C4]/70 ${className ?? ''}`}
    >
      {c && <p className="text-[7px] leading-tight font-extrabold tracking-[0.12em] whitespace-nowrap uppercase opacity-80">{c}</p>}
      <p className="text-[9px] leading-tight font-black tracking-[0.05em] whitespace-nowrap uppercase">★ Equipamento premium</p>
    </div>
  );
}

function Badge({ icon, value, label, className }: { icon: ReactNode; value: string; label: string; className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-[16px] bg-gradient-to-r from-[#9BD373] to-[#E4E75A] py-1.5 pr-3.5 pl-1.5 text-[#0B0918] shadow-[0_10px_30px_-10px_rgba(155,211,115,0.7)] ${className ?? ''}`}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0B0918] text-[#C7E36B]">{icon}</span>
      <span className="leading-none">
        <span className="block text-[20px] font-extrabold tracking-tight font-sans">
          {value}
        </span>
        <span className="block text-[10px] font-semibold opacity-75">{label}</span>
      </span>
    </div>
  );
}

const I = {
  bolt: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
    </svg>
  ),
  bank: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />
    </svg>
  ),
};

const SHARDS = [
  [34, 118, -35, 18],
  [498, 90, 30, 14],
  [470, 260, -30, 10],
  [22, 420, 25, 12],
  [512, 520, -40, 16],
  [60, 700, 35, 10],
  [490, 760, 28, 12],
  [270, 40, -25, 8],
  [150, 250, 40, 7],
  [420, 880, -30, 9],
];

/**
 * Card em formato Story 9:16 (540×960, exportável a 1080×1920)
 */
export const OfferCard = forwardRef<HTMLDivElement, { q: QuickQuote; d: OfferData }>(function OfferCard(
  { q, d },
  ref
) {
  const today = new Date();
  const until = new Date(today.getTime() + d.validityDays * 86400000);
  const date = (x: Date) => x.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const h2 = d.headline2.trim().toUpperCase() || 'IMPERDÍVEL';
  const h2Size = Math.min(84, Math.floor(480 / Math.max(4, h2.length * 0.72)));
  const hasPrice = q.price > 0;

  const hl: { lead: string; big: string; note: string } | null = !hasPrice
    ? null
    : d.highlight === 'cartao' && q.card > 0
    ? { lead: `${d.cardInstallments}x`, big: brl(q.card, 0), note: 'no cartão de crédito' }
    : d.highlight === 'financiamento' && q.financing > 0
    ? { lead: `${d.financingMonths}x`, big: brl(q.financing, 0), note: 'no financiamento' }
    : { lead: '', big: brl(q.cashPrice, 0), note: 'à vista' };

  const secondary =
    hasPrice && hl?.note !== 'à vista'
      ? `${brl(q.cashPrice, 0)} à vista`
      : hasPrice && q.card > 0
      ? `ou ${d.cardInstallments}x de ${brl(q.card, 0)} no cartão`
      : '';

  return (
    <div
      ref={ref}
      style={{ width: STORY_W, height: STORY_H }}
      className="relative overflow-hidden bg-[#07060F] text-white select-none shadow-2xl font-sans"
    >
      {/* ---------- Efeitos de Fundo Luminosos ---------- */}
      <div className="absolute -top-40 -right-32 h-[420px] w-[420px] rounded-full bg-[#6CC690]/35 blur-[90px]" />
      <div className="absolute top-[380px] -left-40 h-[380px] w-[380px] rounded-full bg-[#5B34D6]/40 blur-[90px]" />
      <div className="absolute -right-24 bottom-10 h-[320px] w-[320px] rounded-full bg-[#F3EA3B]/15 blur-[90px]" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(180deg,black,transparent_45%,transparent_70%,black)]" />

      {SHARDS.map(([x, y, r, w], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-gradient-to-r from-[#C7E36B] to-[#6CC690]"
          style={{
            left: x,
            top: y,
            width: w,
            height: 3,
            transform: `rotate(${r}deg)`,
            opacity: 0.55,
            boxShadow: '0 0 8px #9BD373',
          }}
        />
      ))}

      {/* ---------- Topo / Header ---------- */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-7 pt-6 z-20">
        <div className="flex items-center gap-2">
          {d.logoUrl ? (
            <img src={d.logoUrl} alt={d.company} className="h-8 max-w-[160px] object-contain" />
          ) : (
            <span className="text-[17px] font-black tracking-wider text-lime-400">
              ⚡ {d.company || 'QUARK ENERGIA'}
            </span>
          )}
        </div>
        <div className="rounded-full bg-white/[0.08] px-3 py-1.5 text-right ring-1 ring-white/15 backdrop-blur-md">
          <p className="text-[8.5px] font-bold tracking-[0.22em] text-[#C7E36B] uppercase">Pré-Orçamento</p>
          <p className="text-[9px] text-white/60">
            Nº {d.number} · {date(today)}
          </p>
        </div>
      </div>

      {d.campaign.trim() && (
        <div className="absolute top-[68px] left-7 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#E4B83A] via-[#F6DE83] to-[#D69A2B] px-3 py-1 text-[10px] font-extrabold tracking-[0.16em] text-[#2A1A05] uppercase shadow-[0_8px_24px_-8px_rgba(230,180,60,0.8)] z-20">
          ★ {d.campaign.trim().slice(0, 30)}
        </div>
      )}

      {/* ---------- Título Cinematográfico ---------- */}
      <div className="absolute inset-x-0 top-[102px] px-7 text-center z-10">
        <p
          className="py-[0.08em] text-[26px] leading-none font-extrabold tracking-[0.06em] uppercase font-sans"
          style={GRAD_TEXT('linear-gradient(90deg,#6CC690,#C7E36B,#F3EA3B)')}
        >
          {d.headline1.trim() || 'Oportunidade'}
        </p>
        <p
          className="-mt-1 pt-[0.1em] leading-[0.95] font-black tracking-tight"
          style={{
            fontSize: h2Size,
            ...GRAD_TEXT('linear-gradient(180deg,#FFFFFF 0%,#FFFFFF 45%,#9BD373 100%)'),
            filter: 'drop-shadow(0 10px 30px rgba(155,211,115,0.25))',
          }}
        >
          {h2}
        </p>
        <p className="mt-2 text-[12.5px] text-white/70">
          Exclusivo para <b className="text-white font-bold">{d.client.trim() || 'você'}</b>
          {d.city ? ` · ${d.city}` : ''}
        </p>
      </div>

      {/* ---------- Palco dos Equipamentos ---------- */}
      <div className="absolute top-[244px] left-0 h-[296px] w-[336px]">
        <div className="absolute bottom-2 left-8 h-12 w-[290px] rounded-[50%] bg-[#9BD373]/25 blur-2xl" />
        {d.moduleImage ? (
          <div className="absolute top-0 right-0 left-[58px] flex h-[262px] items-center justify-center">
            <ProductPhoto
              src={d.moduleImage}
              shadow="drop-shadow(0 22px 32px rgba(0,0,0,0.6))"
              fallback={<PanelArt id="p1f" className="h-[245px] w-auto" style={{ filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.55))' }} />}
            />
          </div>
        ) : (
          <>
            <PanelArt id="p1" className="absolute top-0 left-[86px] h-[245px] w-auto" style={{ filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.55))' }} />
            <PanelArt id="p2" className="absolute top-[18px] left-[182px] h-[245px] w-auto" style={{ filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.6))' }} />
          </>
        )}
        <Seal campaign={d.campaign} className="absolute top-2 left-[104px] z-20 -rotate-[4deg]" />
        {d.inverterImage ? (
          <div className="absolute bottom-0 left-0 z-10 flex h-[176px] w-[220px] items-center justify-center">
            <ProductPhoto
              src={d.inverterImage}
              shadow="drop-shadow(0 22px 28px rgba(0,0,0,0.7))"
              fallback={<InverterArt id="invf" brand={d.inverterBrand || 'Inversor'} className="h-[172px] w-auto" />}
            />
          </div>
        ) : (
          <InverterArt
            id="inv"
            brand={d.inverterBrand || 'Inversor'}
            className="absolute bottom-0 left-6 z-10 h-[172px] w-auto"
            style={{ filter: 'drop-shadow(0 20px 26px rgba(0,0,0,0.7))' }}
          />
        )}
        <Seal campaign={d.campaign} className="absolute bottom-[8px] left-[128px] z-20 rotate-[3deg]" />
        <div className="absolute bottom-[184px] left-3 z-20 rounded-[14px] bg-[#0D0B1A]/85 px-2.5 py-1.5 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.7)] ring-1 ring-[#9BD373]/40">
          <p className="text-[8.5px] font-bold tracking-[0.14em] text-[#C7E36B] uppercase">Inversor</p>
          <p className="text-[14px] leading-tight font-extrabold">
            {[d.inverterBrand.trim(), d.inverterKw > 0 ? `${fmtNum(d.inverterKw, d.inverterKw % 1 ? 1 : 0)} kW` : ''].filter(Boolean).join(' · ') || 'On-grid'}
          </p>
          <p className="text-[9px] text-white/70">{d.inverterWarranty} anos de garantia</p>
        </div>
      </div>

      {/* ---------- Badges Técnicos à Direita ---------- */}
      <div className="absolute top-[265px] right-6 grid w-[200px] gap-2">
        <Badge
          icon={I.bolt}
          value={`${d.moduleW}W`}
          label={[d.moduleBrand.trim() && `placa ${d.moduleBrand.trim()}`, d.moduleType].filter(Boolean).join(' · ') || 'por placa'}
        />
        {d.efficiency > 0 && <Badge icon={I.chart} value={`${fmtNum(d.efficiency, 1)}%`} label="de eficiência" />}
        <Badge icon={I.shield} value={`${d.moduleWarranty} anos`} label="de garantia das placas" />
        <div className="rounded-[16px] bg-white/[0.07] px-3 py-2 ring-1 ring-white/15 backdrop-blur-md">
          <p className="text-[10px] text-white/60">Geração média mensal</p>
          <p className="text-[21px] leading-tight font-extrabold">
            {fmtNum(q.generation)} <span className="text-[13px] font-bold text-[#C7E36B]">kWh/mês</span>
          </p>
        </div>
      </div>

      {/* ---------- Bloco de Preço, Parcelas e Incluso ---------- */}
      <div className="absolute inset-x-6 top-[546px] bottom-8 flex flex-col gap-2.5">
        <div className="rounded-[26px] bg-gradient-to-br from-[#C7E36B]/60 via-white/10 to-[#6CC690]/50 p-[1.5px]">
          <div className="relative flex items-center gap-3 overflow-hidden rounded-[25px] bg-[#0D0B1A]/90 px-5 py-3">
            <div className="min-w-0 flex-1">
              {hl ? (
                <>
                  <p className="text-[12px] text-white/60">por apenas</p>
                  <p className="flex items-baseline gap-1.5 leading-none">
                    {hl.lead && <span className="text-[20px] font-bold text-white/80">{hl.lead}</span>}
                    <span
                      className="text-[44px] font-black tracking-tight"
                      style={GRAD_TEXT('linear-gradient(90deg,#F3EA3B,#C7E36B 60%,#9BD373)')}
                    >
                      {hl.big}
                    </span>
                  </p>
                  <p className="mt-1 text-[11.5px] font-semibold text-white/80">
                    {hl.note}
                    {secondary && <span className="text-white/55"> · {secondary}</span>}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[12px] text-white/60">economia estimada</p>
                  <p className="text-[44px] leading-none font-black" style={GRAD_TEXT('linear-gradient(90deg,#F3EA3B,#9BD373)')}>
                    {brl(q.monthlySavings, 0)}
                  </p>
                  <p className="mt-1 text-[11.5px] font-semibold text-white/80">por mês na conta de luz</p>
                </>
              )}
            </div>
            {hl && (
              <div className="shrink-0 rounded-[18px] bg-gradient-to-br from-[#9BD373] to-[#6CC690] px-3 py-2 text-center text-[#0B0918]">
                <p className="text-[9px] font-bold tracking-[0.12em] uppercase">Economia</p>
                <p className="text-[18px] leading-tight font-black">{brl(q.monthlySavings, 0)}</p>
                <p className="text-[9px] font-semibold opacity-80">por mês</p>
              </div>
            )}
          </div>
        </div>

        {/* ---------- Incluso + Métricas ---------- */}
        <div className="grid grid-cols-[1.45fr_1fr] gap-2.5">
          <div className="self-start rounded-[22px] bg-gradient-to-br from-[#6CC690] via-[#A8DB6A] to-[#E4E75A] px-4 py-3 text-[#0B0918]">
            <p className="text-[20px] leading-none font-black tracking-tight">Incluso</p>
            <ul className="mt-2 grid content-start gap-1">
              {d.included
                .filter((x) => x.trim())
                .slice(0, 5)
                .map((item, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-1.5 whitespace-nowrap text-[10px] leading-[1.2] font-semibold ${
                      i === 0 ? 'rounded-full bg-[#0B0918] px-2 py-1 text-white' : ''
                    }`}
                  >
                    <span
                      className={`mt-px grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full ${
                        i === 0 ? 'bg-[#C7E36B] text-[#0B0918]' : 'bg-[#0B0918] text-[#C7E36B]'
                      }`}
                    >
                      {I.check}
                    </span>
                    <span className="min-w-0 truncate">{item.trim()}</span>
                  </li>
                ))}
            </ul>
          </div>
          <div className="grid content-start gap-2">
            {[
              [`${brl(q.savings25y / 1000, 0)} mil`, 'de economia em 25 anos'],
              [q.paybackYears > 0 ? `${fmtNum(q.paybackYears, 1)} anos` : `${fmtNum(q.coverage * 100)}%`, q.paybackYears > 0 ? 'para o sistema se pagar' : 'do consumo atendido'],
              [brl(q.billAfter, 0), `sua conta estimada (hoje ${brl(q.billBefore, 0)})`],
            ].map(([v, l]) => (
              <div key={l} className="rounded-[15px] bg-white/[0.07] px-3 py-1.5 ring-1 ring-white/12 backdrop-blur-md">
                <p className="text-[16px] leading-none font-extrabold">{v}</p>
                <p className="mt-0.5 text-[9px] leading-tight text-white/60">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- Condições de Pagamento ---------- */}
        <div className="mt-auto grid grid-cols-2 gap-2">
          {[
            [I.card, d.footer1],
            [I.bank, d.footer2],
          ]
            .filter(([, t]) => (t as string).trim())
            .map(([icon, t], i) => (
              <div key={i} className="flex items-center gap-2 rounded-[14px] bg-white/[0.08] px-2.5 py-1.5 ring-1 ring-white/12">
                <span className="shrink-0 text-[#C7E36B]">{icon as ReactNode}</span>
                <p className="text-[9px] leading-tight font-semibold text-white/85">{t as string}</p>
              </div>
            ))}
        </div>
      </div>

      {/* ---------- Rodapé ---------- */}
      <div className="absolute inset-x-6 bottom-3 flex items-end justify-between gap-2 text-[8.5px] text-white/50">
        <p className="min-w-0 truncate">
          {d.seller ? `${d.seller} · ` : ''}
          {d.sellerPhone ? `WhatsApp ${d.sellerPhone} · ` : ''}válido até {date(until)}
        </p>
        <p className="shrink-0">*Sujeito a análise técnica e vistoria</p>
      </div>
    </div>
  );
});
