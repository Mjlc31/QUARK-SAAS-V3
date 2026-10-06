const UNI = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CEN = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (c) parts.push(CEN[c]);
  if (r < 20) {
    if (r) parts.push(UNI[r]);
  } else {
    const d = Math.floor(r / 10);
    const u = r % 10;
    parts.push(u ? `${DEZ[d]} e ${UNI[u]}` : DEZ[d]);
  }
  return parts.join(" e ");
}

function inteiro(n: number): string {
  if (n === 0) return "zero";
  const grupos: [number, string, string][] = [
    [1_000_000_000, "bilhão", "bilhões"],
    [1_000_000, "milhão", "milhões"],
    [1000, "mil", "mil"],
  ];
  const parts: { v: number; t: string }[] = [];
  let rest = n;
  for (const [base, sing, plur] of grupos) {
    const q = Math.floor(rest / base);
    if (q) {
      parts.push({ v: q, t: base === 1000 && q === 1 ? "mil" : `${ate999(q)} ${q === 1 ? sing : plur}` });
      rest %= base;
    }
  }
  if (rest) parts.push({ v: rest, t: ate999(rest) });
  // "mil e cem", "dois mil e quinhentos": "e" antes do último grupo quando ele é < 100 ou centena redonda.
  const last = parts[parts.length - 1];
  if (parts.length > 1 && (last.v < 100 || last.v % 100 === 0)) {
    return `${parts.slice(0, -1).map((p) => p.t).join(" ")} e ${last.t}`;
  }
  return parts.map((p) => p.t).join(" ");
}

/** Valor em reais por extenso: 1234.5 → "mil duzentos e trinta e quatro reais e cinquenta centavos". */
export function reaisPorExtenso(valor: number): string {
  if (!Number.isFinite(valor) || valor < 0) return "";
  const cents = Math.round(valor * 100);
  const r = Math.floor(cents / 100);
  const c = cents % 100;
  const partes: string[] = [];
  if (r) {
    const txt = inteiro(r);
    const deMilhao = r >= 1_000_000 && r % 1_000_000 === 0;
    partes.push(`${txt}${deMilhao ? " de" : ""} ${r === 1 ? "real" : "reais"}`);
  }
  if (c) partes.push(`${inteiro(c)} ${c === 1 ? "centavo" : "centavos"}`);
  if (!partes.length) return "zero reais";
  return partes.join(" e ");
}
