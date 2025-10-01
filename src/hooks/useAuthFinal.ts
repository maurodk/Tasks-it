import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";

let initialized = false;

export const useAuth = () => {
  const { user, session, profile, loading, setAuth, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    if (initialized) return;
    initialized = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setAuth(null, null);
          setProfile(null);
          return;
        }

        setAuth(session.user, session);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        setProfile(profileData || null);
      } finally {
        setLoading(false);
      }
    };

    init();
  });

  return {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!user && !!profile,
    isManager: profile?.role === "manager",
  };
};
