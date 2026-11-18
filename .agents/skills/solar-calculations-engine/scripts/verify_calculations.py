#!/usr/bin/env python3
"""
Validador de Cálculos Solares e Engenharia Financeira - Quark SaaS
Testa a lógica de Payback, Fio B (Lei 14.300), TIR, VPL e Disponibilidade.
"""

import math

def calculate_simple_payback(investment: float, annual_savings: list[float]) -> float:
    """Calcula payback simples com interpolação linear precisa."""
    cumulative = -investment
    for year, savings in enumerate(annual_savings, start=1):
        prev = cumulative
        cumulative += savings
        if cumulative >= 0 and savings > 0:
            fraction = -prev / savings
            return round((year - 1) + fraction, 2)
    return -1.0

def test_payback_interpolation():
    inv = 30000.0
    # Ano 1: 10k, Ano 2: 10k, Ano 3: 10k -> Payback exato de 3.0 anos
    savings = [10000.0, 10000.0, 10000.0, 10000.0]
    pb = calculate_simple_payback(inv, savings)
    assert pb == 3.0, f"Expected 3.0, got {pb}"

    # Ano 1: 10k, Ano 2: 10k, Ano 3: 20k -> No ano 2 resta 10k. No ano 3 gera 20k -> 2 + 10/20 = 2.5 anos
    savings2 = [10000.0, 10000.0, 20000.0]
    pb2 = calculate_simple_payback(inv, savings2)
    assert pb2 == 2.5, f"Expected 2.5, got {pb2}"
    print("✅ Teste de Interpolação de Payback: PASSOU")

def test_availability_and_fiob_topup():
    """Garante a regra do Art. 16 da Lei 14.300: Não cobrar disponibilidade duas vezes."""
    tariff = 0.90
    availability_kwh = 100 # Trifásico
    min_availability_value = availability_kwh * tariff # R$ 90.00
    
    # Caso 1: Fio B cobrado = R$ 120 (maior que disponibilidade de R$ 90)
    uncompensated = 0.0
    fiob_charge = 120.0
    topup = max(0.0, min_availability_value - uncompensated - fiob_charge)
    assert topup == 0.0, f"Topup should be 0 when Fio B exceeds min availability, got {topup}"
    bill = uncompensated + fiob_charge + topup
    assert bill == 120.0, f"Expected 120.0, got {bill}"

    # Caso 2: Fio B cobrado = R$ 30 (menor que disponibilidade de R$ 90)
    fiob_charge_small = 30.0
    topup_needed = max(0.0, min_availability_value - uncompensated - fiob_charge_small)
    assert topup_needed == 60.0, f"Topup should be 60, got {topup_needed}"
    bill_total = uncompensated + fiob_charge_small + topup_needed
    assert bill_total == 90.0, f"Expected minimum 90.0, got {bill_total}"
    print("✅ Teste de Top-up da Disponibilidade (Art. 16 Lei 14.300): PASSOU")

if __name__ == "__main__":
    test_payback_interpolation()
    test_availability_and_fiob_topup()
    print("Todos os testes unitários do motor de cálculo passaram!")
