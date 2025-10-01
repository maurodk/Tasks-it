# Sistema de Convites - Week Flow Hub

## Melhorias Implementadas

### ✅ Problemas Resolvidos

1. **Página redirecionando após criar convite**

   - Removido `window.location.reload()`
   - Agora usa `fetchInvitations()` para atualizar a lista sem reload

2. **Funcionalidades de convites aprimoradas**

   - ✅ **Reenviar convite**: Para convites expirados, gera novo token e envia novo email
   - ✅ **Cancelar convite**: Remove convite da lista de pendentes
   - ✅ **Copiar link**: Para convites válidos, copia link para área de transferência

3. **Sistema de envio de emails**
   - ✅ Criada Edge Function para envio de emails via Resend
   - ✅ Template HTML profissional para os emails de convite
   - ✅ Envio automático ao criar/reenviar convites

### 🎨 Melhorias na Interface

- **Botões contextuais**:
  - Convites válidos: Mostram botão "Copiar Link"
  - Convites expirados: Mostram botão "Reenviar"
  - Todos os convites não usados: Mostram botão "Cancelar"
- **Cores diferenciadas**:
  - Verde: Copiar link
  - Azul: Reenviar convite
  - Vermelho: Cancelar convite

### 📧 Configuração do Sistema de Email

Para ativar o envio de emails, siga os passos:

#### 1. Criar conta no Resend

1. Acesse [https://resend.com](https://resend.com)
2. Crie uma conta gratuita
3. Vá em "API Keys" e gere uma nova chave
4. Guarde a chave (começará com "re\_")

#### 2. Configurar domínio (opcional mas recomendado)

1. No Resend, vá em "Domains"
2. Adicione seu domínio (ex: weekflowhub.com)
3. Configure os registros DNS no seu provedor de domínio, conforme instruído pelo Resend.
4. Verifique o domínio

#### 3. Deploy da Edge Function

```bash
# No terminal, dentro do projeto
npx supabase functions deploy send-invitation-email

# Configure a variável de ambiente no Supabase
npx supabase secrets set RESEND_API_KEY=sua_chave_aqui
```

#### 4. Configuração alternativa (sem Resend)

Se não quiser usar o Resend, você pode:

- Usar outro provedor (SendGrid, Mailgun, etc.)
- Modificar a Edge Function em `supabase/functions/send-invitation-email/index.ts`
- Ou desabilitar o envio de emails (o sistema continuará funcionando apenas com links)

### 🔧 Como Usar

#### Criar Convite

1. Preencha email e selecione subsetor
2. Clique em "Enviar Convite"
3. Email será enviado automaticamente (se configurado)
4. Link será copiado para área de transferência

#### Gerenciar Convites Pendentes

- **Convite válido**: Clique "Copiar Link" para obter o link novamente
- **Convite expirado**: Clique "Reenviar" para gerar novo link e enviar novo email
- **Qualquer convite**: Clique "Cancelar" para remover da lista

### 🚀 Melhorias Futuras Sugeridas

1. **Histórico de convites**: Manter registro de convites cancelados
2. **Notificações em tempo real**: WebSocket para atualizar status automaticamente
3. **Templates de email personalizáveis**: Permitir customizar o template do email
4. **Convites em lote**: Enviar múltiplos convites de uma vez
5. **Relatórios**: Dashboard com métricas de convites enviados/aceitos

### 🐛 Solução de Problemas

#### Email não está chegando:

1. Verifique se a RESEND_API_KEY está configurada
2. Confirme se o domínio está verificado no Resend
3. Verifique a caixa de spam do destinatário
4. Veja os logs da Edge Function no Supabase Dashboard

#### Convite inválido:

- Use a função "Reenviar" para gerar novo token
- Verifique se o link não foi alterado ao copiar/colar

#### Problemas de permissão:

- Confirme que o usuário tem role "manager"
- Verifique as políticas RLS no Supabase
