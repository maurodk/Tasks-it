import { create } from "zustand";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: "manager" | "collaborator";
  sector_id?: string;
  subsector_id?: string;
  is_approved?: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  setAuth: (user: User | null, session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  setAuth: (user, session) => set({ user, session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, session: null, profile: null });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  },
}));
