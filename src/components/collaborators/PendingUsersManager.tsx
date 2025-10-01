import React from "react";
import { Check, X, User, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SmoothTransition } from "@/components/ui/smooth-transition";
import { SkeletonCard, SkeletonContent } from "@/components/ui/skeleton-card";
import { usePendingUsers } from "@/hooks/usePendingUsers";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PendingUsersManager: React.FC = () => {
  const { pendingUsers, loading, error, approveUser, rejectUser } =
    usePendingUsers();
  const { toast } = useToast();

  const handleApprove = async (userId: string, userName: string) => {
    const success = await approveUser(userId);
    if (success) {
      toast({
        title: "Usuário aprovado",
        description: `${userName} foi aprovado com sucesso.`,
        variant: "default",
      });
    } else {
      toast({
        title: "Erro ao aprovar usuário",
        description: "Não foi possível aprovar o usuário. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (userId: string, userName: string) => {
    if (
      window.confirm(
        `Tem certeza que deseja rejeitar o usuário ${userName}? Esta ação não pode ser desfeita.`
      )
    ) {
      const success = await rejectUser(userId);
      if (success) {
        toast({
          title: "Usuário rejeitado",
          description: `${userName} foi rejeitado e removido do sistema.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Erro ao rejeitar usuário",
          description: "Não foi possível rejeitar o usuário. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const loadingFallback = (
    <SkeletonCard>
      <div className="p-6 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 w-5 bg-muted rounded animate-pulse-glow" />
          <div className="h-6 w-48 bg-muted rounded animate-pulse-glow" />
          <div className="h-6 w-8 bg-muted rounded animate-pulse-glow" />
        </div>
        <div className="h-4 w-64 bg-muted rounded animate-pulse-glow" />
      </div>
      <div className="px-6 pb-6 space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 border rounded-lg bg-muted/50 animate-slide-in"
          >
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-muted rounded-full animate-pulse-glow" />
              <div className="space-y-2">
                <div className="h-5 w-32 bg-muted rounded animate-pulse-glow" />
                <div className="h-4 w-48 bg-muted rounded animate-pulse-glow" />
                <div className="h-4 w-40 bg-muted rounded animate-pulse-glow" />
                <div className="h-3 w-36 bg-muted rounded animate-pulse-glow" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-8 w-20 bg-muted rounded animate-pulse-glow" />
              <div className="h-8 w-20 bg-muted rounded animate-pulse-glow" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonCard>
  );

  const content =
    pendingUsers.length === 0 ? (
      <Card className="dark:bg-[#0f0f0f] dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Usuários Pendentes de Aprovação
          </CardTitle>
          <CardDescription>
            Gerencie os novos usuários que aguardam aprovação para acessar o
            sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Não há usuários pendentes de aprovação no momento.
            </p>
          </div>
        </CardContent>
      </Card>
    ) : (
      <Card className="dark:bg-[#1f1f1f] dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Usuários Pendentes de Aprovação
            <Badge variant="secondary">{pendingUsers.length}</Badge>
          </CardTitle>
          <CardDescription>
            Gerencie os novos usuários que aguardam aprovação para acessar o
            sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-muted/50 hover-transition hover:bg-muted/70 animate-slide-in dark:bg-[#161616] dark:border-gray-800 dark:hover:bg-[#161616]"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-[#09b230]/10 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-[#09b230]" />
                </div>
                <div>
                  <h3 className="font-medium">{user.full_name}</h3>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{user.email}</span>
                  </div>
                  {user.sectors && (
                    <p className="text-sm text-muted-foreground">
                      Setor: {user.sectors.name}
                      {user.subsectors &&
                        ` • Subsetor: ${user.subsectors.name}`}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Solicitado em:{" "}
                    {format(
                      new Date(user.created_at),
                      "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
                      { locale: ptBR }
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApprove(user.id, user.full_name)}
                  className="text-[#09b230] border-[#09b230]/30 hover:bg-[#09b230]/10 hover:border-[#09b230] transition-colors"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Aprovar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReject(user.id, user.full_name)}
                  className="text-red-600 border-red-200 hover:bg-red-50 transition-colors"
                >
                  <X className="h-4 w-4 mr-1" />
                  Rejeitar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );

  return (
    <SmoothTransition
      loading={loading}
      fallback={loadingFallback}
      minLoadingTime={300}
    >
      {content}
    </SmoothTransition>
  );
};

export default PendingUsersManager;
