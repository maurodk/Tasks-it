import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";

let initialized = false;

export const useAuth = () => {
  const { user, session, profile, setAuth, setProfile } = useAuthStore();

  useEffect(() => {
    if (initialized) return;
    initialized = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
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
    };

    init();
  }, [setAuth, setProfile]);

  return {
    user,
    session,
    profile,
    isAuthenticated: !!user && !!profile,
    isManager: profile?.role === "manager",
  };
};