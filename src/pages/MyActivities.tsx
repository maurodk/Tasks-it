import { useState, useMemo } from "react";
import { useOptimizedActivities } from "@/hooks/useOptimizedActivities";
import { useAuth } from "@/hooks/useAuth";
import { ActivityModal } from "@/components/activities/ActivityModal";
import { ActivityDetailModal } from "@/components/activities/ActivityDetailModal";
import { useActivityOperations } from "@/hooks/useActivityOperations";
import { SmoothTransition } from "@/components/ui/smooth-transition";
import { SkeletonCard, SkeletonContent } from "@/components/ui/skeleton-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Activity } from "@/hooks/useActivities";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Target,
  MoreHorizontal,
  Edit,
  Archive,
} from "lucide-react";

export function MyActivities() {
  const { profile, user } = useAuth();
  const { activities, loading, error, refetch } = useOptimizedActivities();
  const { updateActivityStatus, archiveActivity } = useActivityOperations();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Filtrar apenas as atividades atribuídas ao usuário logado
  const myActivities = useMemo(() => {
    if (!activities || !user?.id) return [];
    return activities.filter((activity) => activity.user_id === user.id);
  }, [activities, user?.id]);

  // Estatísticas das minhas atividades
  const stats = useMemo(() => {
    const pending = myActivities.filter((a) => a.status === "pending").length;
    const inProgress = myActivities.filter(
      (a) => a.status === "in_progress"
    ).length;
    const completed = myActivities.filter(
      (a) => a.status === "completed"
    ).length;
    const total = myActivities.length;

    return { pending, inProgress, completed, total };
  }, [myActivities]);

  const handleViewActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setDetailModalOpen(true);
  };

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setActivityModalOpen(true);
  };

  const handleStatusChange = async (
    activityId: string,
    newStatus: Activity["status"]
  ) => {
    await updateActivityStatus(activityId, newStatus);
    refetch();
  };

  const handleArchiveActivity = async (activityId: string) => {
    await archiveActivity(activityId);
    refetch();
  };

  if (!profile) return null;

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Minhas Atividades</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie suas atividades atribuídas
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800/50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.total}
            </div>
            <div className="text-sm text-blue-700 font-medium">
              Total de Atividades
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800/50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats.completed}
            </div>
            <div className="text-sm text-green-700 font-medium">Concluídas</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-800/50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.inProgress}
            </div>
            <div className="text-sm text-yellow-700 font-medium">
              Em Progresso
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800/50">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {stats.pending}
            </div>
            <div className="text-sm text-orange-700 font-medium">Pendentes</div>
          </CardContent>
        </Card>
      </div>

      {/* Activities List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Suas Atividades Atribuídas
          </CardTitle>
          <CardDescription>
            {myActivities.length > 0
              ? `${myActivities.length} atividade${
                  myActivities.length > 1 ? "s" : ""
                } atribuída${myActivities.length > 1 ? "s" : ""} para você`
              : "Nenhuma atividade atribuída no momento"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <SkeletonCard key={i}>
                  <SkeletonContent />
                </SkeletonCard>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-2">Erro ao carregar atividades</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          ) : myActivities.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma atividade atribuída
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Você não possui atividades atribuídas no momento. Quando uma
                atividade for designada para você, ela aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myActivities.map((activity) => (
                <Card
                  key={activity.id}
                  className="cursor-pointer hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900"
                  onClick={() => handleViewActivity(activity)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1 flex-1">
                        {activity.title}
                      </CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditActivity(activity);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {activity.status !== "completed" && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(activity.id, "completed");
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Marcar como Concluída
                            </DropdownMenuItem>
                          )}
                          {activity.status !== "in_progress" &&
                            activity.status !== "completed" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(
                                    activity.id,
                                    "in_progress"
                                  );
                                }}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Marcar como Em Andamento
                              </DropdownMenuItem>
                            )}
                          {activity.status !== "pending" &&
                            activity.status !== "completed" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(activity.id, "pending");
                                }}
                              >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Marcar como Pendente
                              </DropdownMenuItem>
                            )}
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveActivity(activity.id);
                            }}
                            className="text-destructive"
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Arquivar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                          👤 {activity.profiles?.full_name || "Não atribuído"}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-4">
                    {/* Priority and Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          activity.priority === "high"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : activity.priority === "medium"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        }`}
                      >
                        ⚡{" "}
                        {activity.priority === "high"
                          ? "Alta"
                          : activity.priority === "medium"
                          ? "Média"
                          : "Baixa"}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          activity.status === "completed"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : activity.status === "in_progress"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : activity.status === "pending"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                        }`}
                      >
                        {activity.status === "completed"
                          ? "✅"
                          : activity.status === "in_progress"
                          ? "🔄"
                          : activity.status === "pending"
                          ? "⏳"
                          : "📋"}
                        {activity.status === "completed"
                          ? "Concluída"
                          : activity.status === "in_progress"
                          ? "Em Progresso"
                          : activity.status === "pending"
                          ? "Pendente"
                          : activity.status}
                      </span>
                    </div>

                    {/* Description Preview */}
                    {activity.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border-l-2 border-gray-300 dark:border-gray-600">
                        💬 {activity.description}
                      </div>
                    )}

                    {/* Due Date */}
                    {activity.due_date && (
                      <div className="flex items-center gap-2 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-red-700 dark:text-red-300 font-medium">
                          📅 Vence:{" "}
                          {format(new Date(activity.due_date), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    )}

                    {/* Subtasks Progress */}
                    {activity.subtasks && activity.subtasks.length > 0 && (
                      <div className="space-y-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
                            ✅ Subtarefas
                          </span>
                          <span className="text-blue-600 dark:text-blue-400 font-bold">
                            {
                              activity.subtasks.filter((s) => s.is_completed)
                                .length
                            }
                            /{activity.subtasks.length}
                          </span>
                        </div>
                        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${
                                activity.subtasks.length > 0
                                  ? (activity.subtasks.filter(
                                      (s) => s.is_completed
                                    ).length /
                                      activity.subtasks.length) *
                                    100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          {activity.subtasks.length > 0
                            ? `${Math.round(
                                (activity.subtasks.filter((s) => s.is_completed)
                                  .length /
                                  activity.subtasks.length) *
                                  100
                              )}% concluído`
                            : "0% concluído"}
                        </div>
                      </div>
                    )}

                    {/* Footer com informações extras */}
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          🏢 {activity.subsectors?.name || "Sem subsetor"}
                        </span>
                        {activity.created_at && (
                          <span className="flex items-center gap-1">
                            📅{" "}
                            {format(new Date(activity.created_at), "dd/MM", {
                              locale: ptBR,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      <SmoothTransition
        loading={loading}
        fallback={
          <div className="container mx-auto p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i}>
                <SkeletonContent />
              </SkeletonCard>
            ))}
          </div>
        }
        className="container mx-auto p-6"
      >
        {content}
      </SmoothTransition>

      {/* Activity Modal para edição */}
      {activityModalOpen && selectedActivity && (
        <ActivityModal
          activity={selectedActivity}
          open={activityModalOpen}
          onOpenChange={(open) => {
            setActivityModalOpen(open);
            if (!open) setSelectedActivity(null);
          }}
          onSuccess={() => {
            refetch();
            setActivityModalOpen(false);
            setSelectedActivity(null);
          }}
        />
      )}

      {/* Activity Detail Modal para visualização */}
      {detailModalOpen && selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          open={detailModalOpen}
          onOpenChange={(open) => {
            setDetailModalOpen(open);
            if (!open) setSelectedActivity(null);
          }}
        />
      )}
    </>
  );
}
