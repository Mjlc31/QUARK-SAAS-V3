// Números por extenso em português do Brasil (inteiros, reais e percentuais).
const UNI = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CEM = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos',
  'setecentos', 'oitocentos', 'novecentos'];

function feminino(txt) {
  return txt.replace(/\bum\b/g, 'uma').replace(/\bdois\b/g, 'duas').replace(/entos\b/g, 'entas');
}

function ate999(n) {
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100), r = n % 100, partes = [];
  if (c) partes.push(CEM[c]);
  if (r) {
    if (r < 20) partes.push(UNI[r]);
    else partes.push(DEZ[Math.floor(r / 10)] + (r % 10 ? ' e ' + UNI[r % 10] : ''));
  }
  return partes.join(' e ');
}

const ESCALAS = [
  null,
  ['mil', 'mil'],
  ['milhão', 'milhões'],
  ['bilhão', 'bilhões'],
];

/** Inteiro por extenso. genero: 'm' | 'f' */
function inteiro(n, genero = 'm') {
  n = Math.round(Number(n));
  if (!Number.isFinite(n) || n < 0) throw new Error(`Número inválido para extenso: ${n}`);
  if (n === 0) return 'zero';
  const grupos = [];
  let x = n;
  while (x > 0) { grupos.push(x % 1000); x = Math.floor(x / 1000); }

  const partes = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (!g) continue;
    let txt;
    if (i === 0) txt = ate999(g);
    else if (i === 1) txt = g === 1 ? 'mil' : `${ate999(g)} mil`;
    else txt = `${ate999(g)} ${g === 1 ? ESCALAS[i][0] : ESCALAS[i][1]}`;
    if (genero === 'f' && i <= 1) txt = feminino(txt);
    partes.push({ txt, g, i });
  }
  // Conector: "e" antes do último grupo se ele for < 100 ou centena redonda; senão espaço.
  let out = partes[0].txt;
  for (let k = 1; k < partes.length; k++) {
    const p = partes[k];
    const usaE = k === partes.length - 1 && (p.g < 100 || p.g % 100 === 0);
    out += (usaE ? ' e ' : ' ') + p.txt;
  }
  return out;
}

/** Valor em reais por extenso: 33867 -> "trinta e três mil oitocentos e sessenta e sete reais" */
function reais(valor) {
  const centavosTot = Math.round(Number(valor) * 100);
  const r = Math.floor(centavosTot / 100), c = centavosTot % 100;
  const partes = [];
  if (r > 0) {
    const de = r >= 1e6 && r % 1e6 === 0 ? ' de' : '';
    partes.push(`${inteiro(r)}${de} ${r === 1 ? 'real' : 'reais'}`);
  }
  if (c > 0) partes.push(`${inteiro(c)} ${c === 1 ? 'centavo' : 'centavos'}`);
  return partes.length ? partes.join(' e ') : 'zero real';
}

module.exports = { inteiro, reais };
