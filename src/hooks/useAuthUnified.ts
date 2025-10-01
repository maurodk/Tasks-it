import { useAuthStore } from "@/stores/authStore";

export const useAuth = () => {
  const { user, session, profile, loading } = useAuthStore();
  
  return {
    user,
    session,
    profile,
    loading,
    isAuthenticated: !!user && !!profile,
    isManager: profile?.role === "manager",
  };
};