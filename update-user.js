import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://btbfkpzydyedzarpsvkm.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0YmZrcHp5ZHllZHphcnBzdmttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjE1NzMyOCwiZXhwIjoyMDcxNzMzMzI4fQ.rDkrzIsSohedMHSxUw92FZhcZ8dt-TrJwiMvLnGZLh0"; // ⚠️ service_role (NÃO use anon!)

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Atualiza o e-mail no Authentication
const { data, error } = await supabase.auth.admin.updateUserById(
  "951eab3e-3ef8-4930-8667-35703ab28891", // id do usuário no Auth
  { email: "nathalia.brito@vcaconstrutora.com.br" }
);

if (error) {
  console.error("Erro ao atualizar email:", error.message);
} else {
  console.log("Email atualizado com sucesso:", data);
}
