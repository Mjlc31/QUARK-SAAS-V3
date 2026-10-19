#!/usr/bin/env bash
# ==========================================================
# Quark SaaS — Script de Inicialização Completa
# ==========================================================
set -e

echo "🚀 Iniciando containers Docker (Evolution API, Redis, Postgres, N8N)..."
docker compose up -d

echo "⚡ Iniciando Backend Unificado do Quark (porta 3001)..."
npm run server &

echo "🎨 Iniciando Frontend Quark (Vite na porta 5173)..."
npm run dev
