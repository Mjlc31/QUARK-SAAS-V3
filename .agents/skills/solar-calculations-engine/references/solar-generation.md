# Dimensionamento Fotovoltaico e Geração de Energia

Este documento define os padrões de engenharia para cálculo de potência, geração de energia e equivalências ambientais no Quark SaaS.

---

## 1. Dimensionamento de Potência de Pico ($P_{\text{kWp}}$)

A potência do gerador solar é dimensionada para atender a meta de compensação do consumo mensal médio:

$$P_{\text{kWp}} = \frac{E_{\text{alvo}} (\text{kWh/mês})}{\text{Fator de Geração} (\text{kWh/kWp/mês})}$$

Onde o **Fator de Geração** ($F_g$) é determinado por:
$$F_g = \text{HSP} \times \text{PR} \times 30.41$$

- **HSP (Horas de Sol Pleno)**: Média diária de irradiação solar no plano dos módulos ($\text{kWh/m}^2/\text{dia}$). Padrão Alagoas / Maceió: $5.2 \text{ a } 5.5 \text{ HSP}$.
- **PR (Performance Ratio)**: Índice de mérito global do sistema (0.75 a 0.82), contemplando perdas por temperatura, sujidade, cabeamento CA/CC, sombreamento e eficiência dos inversores.
- **30.41**: Média de dias por mês ($365 / 12$).

### Exemplo em Alagoas:
$$F_g = 5.2 \times 0.80 \times 30.41 \approx 126.5 \text{ kWh/kWp/mês}$$

---

## 2. Número de Módulos e Sobredimensionamento (Overpowering / FDI)

$$N_{\text{módulos}} = \left\lceil \frac{P_{\text{kWp}} \times 1000}{W_{\text{p, módulo}}} \right\rceil$$
$$P_{\text{instalada (kWp)}} = \frac{N_{\text{módulos}} \times W_{\text{p, módulo}}}{1000}$$

### Razão CC/CA (Fator de Dimensionamento do Inversor - FDI):
$$\text{FDI} = \frac{P_{\text{CC (kWp)}}}{P_{\text{CA (kW)}}}$$
- Faixa ideal recomendada: $1.15 \text{ a } 1.35$ (115% a 135% de sobrecarga CC para otimizar o início e fim do dia sem clipping excessivo).

---

## 3. Sazonalidade da Geração

A irradiação varia ao longo dos meses. Para o Nordeste brasileiro (Alagoas):
- Meses de maior irradiação (Verão/Primavera): Outubro a Março ($+5\%$ a $+20\%$).
- Meses chuvosos de menor irradiação (Inverno): Maio a Julho ($-15\%$ a $-20\%$).

A geração mensal $m$ ($m=1 \dots 12$) com sazonalidade:
$$E_m = P_{\text{kWp}} \times \left(\frac{F_g}{30.41}\right) \times s_m \times D_m$$
onde $s_m$ é o fator normalizado de sazonalidade e $D_m$ é a quantidade de dias do mês.

---

## 4. Métricas Ambientais (CO₂ e Árvores)

Padrões oficiais baseados nos relatórios do Sistema Interligado Nacional (SIN) e Ministério da Ciência, Tecnologia e Inovação (MCTI):

- **Fator de emissão da rede elétrica brasileira**: $0.0904 \text{ kg CO}_2/\text{kWh}$ (ou $0.0904 \text{ t CO}_2/\text{MWh}$).
- **Absorção média de uma árvore nativa em crescimento**: $10 \text{ kg CO}_2/\text{ano}$ (ou $1 \text{ tonelada de CO}_2 \approx 100 \text{ árvores}$).

$$\text{CO}_2 \text{ Evitado Anual (kg)} = E_{\text{anual (kWh)}} \times 0.0904$$
$$\text{CO}_2 \text{ Evitado em 25 Anos (ton)} = \frac{\text{CO}_2 \text{ Anual} \times 25}{1000}$$
$$\text{Árvores Equivalentes} = \text{round}\left(\frac{\text{CO}_2 \text{ Evitado 25 Anos (kg)}}{10}\right)$$
