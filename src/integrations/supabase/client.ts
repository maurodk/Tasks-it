import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Use as variáveis do Vite (configure no Vercel: VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Evita erro em build/SSR ao acessar localStorage
const storage =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined"
    ? window.localStorage
    : undefined;

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
