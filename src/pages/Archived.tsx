import { useState, useMemo } from "react";
import { useArchivedActivities } from "@/hooks/useArchivedActivities";
import { useAuth } from "@/hooks/useAuthFinal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SmoothTransition } from "@/components/ui/smooth-transition";
import { SkeletonCard, SkeletonContent } from "@/components/ui/skeleton-card";
import { ActivityViewModal } from "@/components/activities/ActivityViewModal";
import {
  Archive,
  FileText,
  AlertCircle,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Activity } from "@/hooks/useActivities";
import { ArchivedActivity } from "@/hooks/useArchivedActivities";

export function Archived() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // Usando o hook específico para atividades arquivadas
  const { activities, loading, deleteActivity, unarchiveActivity } =
    useArchivedActivities();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const allSelectedOnDate = (dateKey: string, items: ArchivedActivity[]) =>
    items.every((a) => selectedIds.has(a.id));

  const toggleSelectGroup = (items: ArchivedActivity[]) => {
    const allSelected = items.every((a) => selectedIds.has(a.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        items.forEach((a) => next.delete(a.id));
      } else {
        items.forEach((a) => next.add(a.id));
      }
      return next;
    });
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      // sequential to avoid overload
      await deleteActivity(id);
    }
    clearSelection();
  };

  const handleDeleteActivity = async (
    activityId: string,
    activityTitle: string
  ) => {
    // O novo hook já gerencia toast e erro internamente
    await deleteActivity(activityId);
  };

  const handleUnarchiveActivity = async (
    activityId: string,
    newStatus: "pending" | "in_progress" = "pending"
  ) => {
    await unarchiveActivity(activityId, newStatus);
  };

  const handleViewActivity = (activity: ArchivedActivity) => {
    // Converter ArchivedActivity para Activity
    const fullActivity: Activity = {
      ...activity,
      subtasks: activity.subtasks || [],
    };
    setSelectedActivity(fullActivity);
    setActivityModalOpen(true);
  };

  if (!profile) return null;

  // Helper to choose the archive timestamp: prefer activity_history entry with action 'archived'
  const getArchiveTimestamp = (activity: ArchivedActivity): string => {
    const history = activity.activity_history;
    if (Array.isArray(history)) {
      const h = history.find((x) => x.action === "archived");
      if (h && h.created_at) return h.created_at;
    }
    return activity.updated_at || activity.created_at;
  };

  // Agrupar por data de arquivamento: preferir o timestamp do histórico (action: 'archived'),
  // senão usar updated_at, senão created_at.
  const groupedActivities = activities.reduce((groups, activity) => {
    const archiveDate = getArchiveTimestamp(activity);
    const dateKey = new Date(archiveDate).toLocaleDateString("pt-BR");
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
    return groups;
  }, {} as Record<string, typeof activities>);

  const loadingFallback = (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-muted rounded animate-pulse-glow" />
          <div>
            <div className="h-8 w-64 bg-muted rounded animate-pulse-glow mb-2" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse-glow" />
          </div>
        </div>
        <div className="h-6 w-16 bg-muted rounded animate-pulse-glow ml-auto" />
      </div>{" "}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i}>
            <SkeletonContent lines={3} showBadge showActions />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );

  const content = (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Archive className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Atividades Arquivadas
            </h1>
            <p className="text-muted-foreground">
              Histórico de atividades que foram arquivadas
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary">
            {activities.length}{" "}
            {activities.length === 1 ? "atividade" : "atividades"}
          </Badge>
          <Button
            variant={selectMode ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectMode((v) => !v)}
          >
            {selectMode ? "Sair da seleção" : "Selecionar"}
          </Button>
          {selectMode && selectedIds.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Excluir selecionadas ({selectedIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Excluir atividades selecionadas
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação removerá permanentemente {selectedIds.size}{" "}
                    atividade(s). Deseja continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={bulkDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {activities.length === 0 ? (
        <Card className="dark:bg-[#1f1f1f] dark:border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhuma atividade arquivada
            </h3>
            <p className="text-muted-foreground max-w-md">
              Quando você arquivar atividades, elas aparecerão aqui para
              consulta histórica.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedActivities)
            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
            .map(([dateKey, dayActivities]) => (
              <div key={dateKey} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">
                    {dateKey}
                  </h2>
                  <Badge variant="outline">
                    {dayActivities.length}{" "}
                    {dayActivities.length === 1 ? "atividade" : "atividades"}
                  </Badge>
                  {selectMode && (
                    <label className="ml-2 inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={allSelectedOnDate(dateKey, dayActivities)}
                        onChange={() => toggleSelectGroup(dayActivities)}
                      />
                      Selecionar todas
                    </label>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {dayActivities.map((activity) => (
                    <Card
                      key={activity.id}
                      className="relative hover-transition animate-fade-in dark:bg-[#161616] dark:border-gray-800 cursor-pointer hover:shadow-md"
                      onClick={() => handleViewActivity(activity)}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-lg">
                              {activity.title}
                            </CardTitle>
                            <CardDescription>
                              Criado por:{" "}
                              {activity.profiles?.full_name || "Desconhecido"}
                            </CardDescription>
                          </div>
                          <div className="flex gap-1">
                            {selectMode && (
                              <input
                                type="checkbox"
                                className="h-4 w-4 mt-2"
                                checked={selectedIds.has(activity.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleSelect(activity.id);
                                }}
                                title="Selecionar atividade"
                              />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnarchiveActivity(activity.id, "pending");
                              }}
                              title="Recuperar como Pendente"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent
                                onClick={(e) => e.stopPropagation()}
                              >
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Excluir atividade
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir
                                    permanentemente a atividade "
                                    {activity.title}"? Esta ação não pode ser
                                    desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Cancelar
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDeleteActivity(
                                        activity.id,
                                        activity.title
                                      )
                                    }
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                        <div className="flex justify-between items-center">
                          <div
                            className="flex gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Badge variant="outline">{activity.status}</Badge>
                            {activity.priority && (
                              <Badge
                                variant={
                                  activity.priority === "high"
                                    ? "destructive"
                                    : activity.priority === "medium"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {activity.priority}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(getArchiveTimestamp(activity)),
                              {
                                addSuffix: true,
                                locale: ptBR,
                              }
                            )}
                          </div>
                        </div>
                        {activity.due_date && (
                          <div className="text-xs text-muted-foreground">
                            Vencimento:{" "}
                            {format(
                              new Date(activity.due_date),
                              "dd/MM/yyyy 'às' HH:mm",
                              { locale: ptBR }
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <SmoothTransition
        loading={loading}
        fallback={loadingFallback}
        minLoadingTime={400}
      >
        {content}
      </SmoothTransition>

      {activityModalOpen && selectedActivity && (
        <ActivityViewModal
          activity={selectedActivity}
          isOpen={activityModalOpen}
          onClose={() => {
            setActivityModalOpen(false);
            setSelectedActivity(null);
          }}
        />
      )}
    </>
  );
}
