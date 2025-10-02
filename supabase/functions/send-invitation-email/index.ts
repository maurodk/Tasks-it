import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface InvitationEmailRequest {
  email: string;
  inviterName: string;
  inviteLink: string;
  subsectorName: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Starting email function...");

    const {
      email,
      inviterName,
      inviteLink,
      subsectorName,
    }: InvitationEmailRequest = await req.json();

    console.log("📧 Email request data:", {
      email,
      inviterName,
      subsectorName,
    });

    // MODO DESENVOLVIMENTO - Apenas simular envio
    console.log("📧 Development mode - Email would be sent to:", email);
    console.log("🔗 Invite link:", inviteLink);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Development mode - Email simulated",
        email_to: email,
        invite_link: inviteLink,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Convite para TASKIT</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #09b230; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { 
              display: inline-block; 
              background: #09b230; 
              color: white; 
              padding: 12px 30px; 
              text-decoration: none; 
              border-radius: 5px; 
              font-weight: bold;
              margin: 20px 0;
            }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Você foi convidado!</h1>
            </div>
            <div class="content">
              <h2>Bem-vindo ao TASKIT</h2>
              <p>Olá!</p>
              <p><strong>${inviterName}</strong> convidou você para fazer parte da equipe do <strong>${subsectorName}</strong> no TASKIT.</p>

              <p>O TASKIT é nossa plataforma de gestão de atividades onde você poderá:</p>
              <ul>
                <li>✅ Gerenciar suas atividades diárias</li>
                <li>📅 Acompanhar prazos e entregas</li>
                <li>👥 Colaborar com sua equipe</li>
                <li>📊 Visualizar seu progresso</li>
              </ul>

              <p>Para aceitar o convite e criar sua conta, clique no botão abaixo:</p>
              
              <div style="text-align: center;">
                <a href="${inviteLink}" class="button">Aceitar Convite</a>
              </div>
              
              <p><strong>⚠️ Importante:</strong> Este convite expira em 7 dias. Não deixe para depois!</p>
              
              <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; background: #e9e9e9; padding: 10px; border-radius: 4px;">
                ${inviteLink}
              </p>
            </div>
            <div class="footer">
              <p>Este email foi enviado automaticamente pelo TASKIT</p>
              <p>Se você não esperava receber este convite, pode ignorar este email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
Você foi convidado para o TASKIT!

${inviterName} convidou você para fazer parte da equipe do ${subsectorName} no TASKIT.

Para aceitar o convite e criar sua conta, acesse: ${inviteLink}

⚠️ Este convite expira em 7 dias.

TASKIT - Sistema de Gestão de Atividades
    `;

    console.log("📤 Sending email via Resend API...");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "TASKIT <onboarding@resend.dev>",
        to: [email],
        subject: `🎉 Convite para TASKIT - ${subsectorName}`,
        html: emailHtml,
        text: emailText,
      }),
    });

    console.log("📊 Resend API response status:", res.status);

    if (!res.ok) {
      const error = await res.text();
      console.error("❌ Resend API error:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to send email",
          details: error,
          status: res.status,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await res.json();
    console.log("✅ Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("💥 Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
