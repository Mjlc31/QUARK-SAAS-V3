const test = require('node:test');
const assert = require('node:assert/strict');
const { inteiro, reais } = require('../lib/extenso');

test('inteiro por extenso', () => {
  const casos = {
    1: 'um', 100: 'cem', 101: 'cento e um', 1000: 'mil', 1100: 'mil e cem', 2500: 'dois mil e quinhentos',
    33867: 'trinta e três mil oitocentos e sessenta e sete', 1000000: 'um milhão', 0: 'zero', 15: 'quinze', 84: 'oitenta e quatro',
  };
  for (const [n, txt] of Object.entries(casos)) assert.equal(inteiro(Number(n)), txt, `n=${n}`);
});

test('reais por extenso, com centavos', () => {
  assert.equal(reais(1), 'um real');
  assert.equal(reais(33867), 'trinta e três mil oitocentos e sessenta e sete reais');
  assert.equal(reais(1000000), 'um milhão de reais');
  assert.equal(reais(0.01), 'um centavo');
  assert.equal(reais(0.5), 'cinquenta centavos');
  assert.equal(reais(98500.5), 'noventa e oito mil e quinhentos reais e cinquenta centavos');
  assert.equal(reais(1.99), 'um real e noventa e nove centavos');
});

test('número inválido lança', () => {
  assert.throws(() => inteiro(-1));
  assert.throws(() => inteiro(NaN));
});
