import { useAuth } from "@/hooks/useAuthFinal";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isAuthenticated, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="text-center space-y-4 glass-effect p-8 rounded-2xl">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Block unapproved users
  if (profile && profile.is_approved === false) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="space-y-3 text-center">
          <h1 className="text-lg font-medium">Aguardando aprovação</h1>
          <p className="text-sm text-muted-foreground">
            Seu acesso ainda não foi aprovado pelo gestor.
          </p>
          <Button
            variant="destructive"
            onClick={async () => {
              try {
                await supabase.auth.signOut();
              } catch (e) {
                console.error("Erro ao sair:", e);
              } finally {
                window.location.assign("/auth");
              }
            }}
          >
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
