import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

// Pega as variáveis de ambiente do seu arquivo .env ou .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Corrigido o nome da variável para corresponder ao arquivo .env
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL and Anon Key must be defined in your .env file"
  );
}

// Cria e exporta o cliente Supabase
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
