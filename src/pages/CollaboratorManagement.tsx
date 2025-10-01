import { useAuth } from "@/hooks/useAuthFinal";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import PendingUsersManager from "@/components/collaborators/PendingUsersManager";
import ActiveCollaboratorsManager from "@/components/collaborators/ActiveCollaboratorsManager";

const CollaboratorManagement = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#09b230] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Você precisa estar logado para acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (profile.role !== "manager" || !profile.is_approved) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              {profile.role !== "manager"
                ? "Apenas gestores podem acessar a gestão de colaboradores."
                : "Sua conta ainda não foi aprovada. Aguarde a aprovação de outro gestor."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Gestão de Colaboradores
            </h1>
            <p className="text-muted-foreground">
              Gerencie colaboradores e aprove novos usuários do sistema
            </p>
          </div>
        </div>
      </div>

      <PendingUsersManager />
      <ActiveCollaboratorsManager />
    </div>
  );
};

export default CollaboratorManagement;
