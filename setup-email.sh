#!/bin/bash

# Script de configuração do sistema de emails
echo "🚀 Configurando sistema de emails do Week Flow Hub"

# Verificar se o Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado. Instale com:"
    echo "npm install -g supabase"
    exit 1
fi

# Solicitar API key do Resend
echo "📧 Configure sua API key do Resend:"
echo "1. Acesse https://resend.com"
echo "2. Crie uma conta e obtenha sua API key"
echo "3. Cole a API key abaixo (começará com 're_')"
echo ""
read -p "Digite sua API key do Resend: " RESEND_KEY

# Configurar secret no Supabase
echo "🔑 Configurando secret no Supabase..."
supabase secrets set RESEND_API_KEY="$RESEND_KEY"

# Deploy da edge function
echo "📤 Fazendo deploy da edge function..."
supabase functions deploy send-invitation-email

echo "✅ Configuração concluída!"
echo "💡 Teste criando um convite no seu app para verificar se o email está sendo enviado."
