import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";

export const useAuthStable = () => {
  const { user, session, profile, loading, setAuth, setProfile, setLoading } = useAuthStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initializeAuth = async () => {
      setLoading(true);
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
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
      } catch (error) {
        console.error("❌ Auth error:", error);
        setAuth(null, null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  return {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!user && !!profile,
    isManager: profile?.role === "manager",
  };
};