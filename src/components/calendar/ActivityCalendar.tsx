import { useState, useCallback } from "react";
import { useMemo, useEffect } from "react";
import "@/styles/scrollbar.css";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle,
  Circle,
  Edit,
  Archive,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActivities, Activity } from "@/hooks/useActivities";
import { ActivityEditModal } from "@/components/activities/ActivityEditModal";
import { ActivityDetailModal } from "@/components/activities/ActivityDetailModal";
import { isSameDay } from "date-fns";
import { useActivityOperations } from "@/hooks/useActivityOperations";
import { useAuth } from "@/hooks/useAuthFinal";

interface DayData {
  date: Date;
  activities: Activity[];
  weekNumber: number;
}

interface ActivityCalendarProps {
  subsectorId?: string; // Novo: para filtrar por subsetor
}

export const ActivityCalendar = ({ subsectorId }: ActivityCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [defaultActivityDate, setDefaultActivityDate] = useState<
    Date | undefined
  >(undefined);

  // Estabilizar as options para evitar re-renders infinitos
  const options = useMemo(
    () => ({
      includeArchived: false, // Não incluir arquivadas no calendário
      subsectorId, // Filtrar por subsetor se fornecido
    }),
    [subsectorId]
  );

  const {
    activities,
    loading,
    updateActivityStatus,
    archiveActivity,
    refetch,
  } = useActivities(options);
  const { createActivity, updateActivity } = useActivityOperations();
  const { profile } = useAuth();
  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Obter primeiro dia do mês e quantos dias tem
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Obter número da semana
  const getWeekNumber = (date: Date) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  };

  // Atualizar selectedDay quando as atividades mudarem
  const updateSelectedDay = useCallback(() => {
    setSelectedDay((prev) => {
      if (!prev) return null;

      const updatedActivities = activities.filter((activity) => {
        if (!activity.due_date) return false;
        const activityDate = new Date(activity.due_date);
        return isSameDay(activityDate, prev.date);
      });

      return {
        ...prev,
        activities: updatedActivities,
      };
    });
  }, [activities]);

  useEffect(() => {
    updateSelectedDay();
  }, [updateSelectedDay]);

  // Navegar entre meses
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Gerar dias do calendário
  const generateCalendarDays = () => {
    const days: (DayData | null)[] = [];

    // Adicionar dias vazios no início
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Adicionar dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const weekNumber = getWeekNumber(date);

      // Filtrar atividades para este dia (baseado na data de criação)
      const dayActivities = activities.filter((activity) => {
        // Sempre usar created_at para organizar atividades no calendário
        const createdDate = new Date(activity.created_at);
        return createdDate.toDateString() === date.toDateString();
      });

      days.push({
        date,
        activities: dayActivities,
        weekNumber,
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const getStatusIcon = (status: Activity["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3 w-3 text-accent" />;
      case "in_progress":
        return <Clock className="h-3 w-3 text-warning" />;
      default:
        return <Circle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: Activity["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const handleNewActivity = (date?: Date) => {
    setEditingActivity(null);

    // Se uma data for fornecida, ajustar para 23:59:59 do mesmo dia
    if (date) {
      const adjustedDate = new Date(date);
      adjustedDate.setHours(23, 59, 59, 999);
      setDefaultActivityDate(adjustedDate);
    } else {
      setDefaultActivityDate(date);
    }

    setActivityModalOpen(true);
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setActivityModalOpen(true);
  };

  const handleViewActivity = (activity: Activity) => {
    setDetailActivity(activity);
    setDetailModalOpen(true);
  };

  const handleActivitySuccess = () => {
    refetch();
    // Forçar uma re-renderização completa dos dados do calendário
    setSelectedDay((prev) => {
      if (!prev) return null;

      // Buscar atividades atualizadas para o dia selecionado
      const updatedActivities = activities.filter((activity) => {
        if (!activity.created_at) return false;
        const activityDate = new Date(activity.created_at);
        return isSameDay(activityDate, prev.date);
      });

      return {
        ...prev,
        activities: updatedActivities,
      };
    });

    // Pequeno delay para garantir que o refetch foi processado
    setTimeout(() => {
      setSelectedDay((prev) => {
        if (!prev) return null;

        const updatedActivities = activities.filter((activity) => {
          if (!activity.created_at) return false;
          const activityDate = new Date(activity.created_at);
          return isSameDay(activityDate, prev.date);
        });

        return {
          ...prev,
          activities: updatedActivities,
        };
      });
    }, 100);
  };

  const handleSaveActivity = async (partial: Partial<Activity>) => {
    type Priority = Activity["priority"];
    type Status = Activity["status"];
    const maybePrivate = (partial as unknown as { is_private?: boolean })
      .is_private;
    if (!editingActivity) {
      // Create
      const targetSubsectorId = subsectorId || profile?.subsector_id;
      if (!targetSubsectorId) {
        // No possible subsector; just bail and close
        setActivityModalOpen(false);
        return;
      }

      await createActivity({
        title: partial.title || "",
        description: partial.description,
        subsector_id: targetSubsectorId,
        due_date: partial.due_date as string | undefined,
        priority: partial.priority as Priority | undefined,
        status: (partial.status as Status) || "pending",
        user_id: partial.user_id,
        is_private: maybePrivate,
      });

      handleActivitySuccess();
      setActivityModalOpen(false);
    } else {
      // Update
      await updateActivity({
        id: editingActivity.id,
        title: partial.title,
        description: partial.description,
        due_date: partial.due_date as string | undefined,
        priority: partial.priority as Priority | undefined,
        status: partial.status as Status | undefined,
        user_id: partial.user_id,
        is_private: maybePrivate,
      });

      handleActivitySuccess();
      setActivityModalOpen(false);
    }
  };

  const handleStatusChange = async (
    activityId: string,
    newStatus: Activity["status"]
  ) => {
    await updateActivityStatus(activityId, newStatus);
    handleActivitySuccess();
  };

  const handleArchiveActivity = async (activityId: string) => {
    await archiveActivity(activityId);
    handleActivitySuccess();
  };

  return (
    <div className="flex gap-6 h-[calc(110vh)]">
      {/* Calendário Principal */}
      <Card className="flex-1 dark:bg-[#0f0f0f] flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">
              {monthNames[currentMonth]} {currentYear}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground p-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid do calendário */}
          {loading ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, index) => (
                <Skeleton key={index} className="min-h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((dayData, index) => (
                <div
                  key={index}
                  className={`min-h-24 p-2 border rounded-lg transition-all duration-200 cursor-pointer ${
                    dayData
                      ? dayData.date.toDateString() === today.toDateString()
                        ? "bg-[#09b230]/10 border-[#09b230]"
                        : "bg-card hover:bg-card-hover border-border hover:border-border-hover"
                      : "bg-muted/20"
                  } ${
                    selectedDay?.date.toDateString() ===
                    dayData?.date.toDateString()
                      ? "ring-2 ring-[#09b230]"
                      : ""
                  }`}
                  onClick={() => dayData && setSelectedDay(dayData)}
                >
                  {dayData && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-sm font-medium ${
                            dayData.date.toDateString() === today.toDateString()
                              ? "text-[#09b230]"
                              : "text-foreground"
                          }`}
                        >
                          {dayData.date.getDate()}
                        </span>
                        {dayData.activities.length > 0 && (
                          <Badge
                            variant={
                              dayData.activities.some(
                                (a) => a.priority === "high"
                              )
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {dayData.activities.length}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayData.activities.slice(0, 2).map((activity) => (
                          <div
                            key={activity.id}
                            className={`text-xs p-1 rounded truncate ${
                              activity.priority === "high"
                                ? "bg-red-100 border border-red-300 text-black font-medium"
                                : "bg-secondary text-secondary-foreground"
                            }`}
                          >
                            {activity.title}
                          </div>
                        ))}
                        {dayData.activities.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayData.activities.length - 2} mais
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Painel lateral - Detalhes do dia */}
      <Card className="w-96 dark:bg-[#0f0f0f] flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {selectedDay
                ? `${selectedDay.date.getDate()} de ${
                    monthNames[selectedDay.date.getMonth()]
                  }`
                : "Selecione um dia"}
            </CardTitle>
            <Button
              size="sm"
              style={{ backgroundColor: "#09b230", borderColor: "#09b230" }}
              className="hover:bg-[#08a02b] hover:border-[#08a02b] transition-colors"
              onClick={() => handleNewActivity(selectedDay?.date)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Atividade
            </Button>
          </div>
          {selectedDay && (
            <p className="text-sm text-muted-foreground">
              Semana {selectedDay.weekNumber} • {selectedDay.activities.length}{" "}
              atividades
            </p>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          {selectedDay ? (
            <div className="space-y-4 h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 dark:hover:scrollbar-thumb-gray-500">
              {selectedDay.activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Circle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma atividade para este dia</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-[#09b230] text-[#09b230] hover:bg-[#09b230] hover:text-white"
                    onClick={() => handleNewActivity(selectedDay.date)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Atividade
                  </Button>
                </div>
              ) : (
                selectedDay.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                      activity.priority === "high"
                        ? "bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 dark:from-red-900/20 dark:via-rose-900/20 dark:to-pink-900/20 border-2 border-red-200 dark:border-red-700 shadow-lg shadow-red-100 dark:shadow-red-900/20"
                        : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg hover:border-[#09b230]/30 dark:hover:border-[#09b230]/50"
                    }`}
                    onClick={() => handleViewActivity(activity)}
                  >
                    {/* Linha decorativa superior */}
                    <div
                      className={`h-1 w-full ${
                        activity.priority === "high"
                          ? "bg-gradient-to-r from-red-500 to-pink-500"
                          : activity.status === "completed"
                          ? "bg-gradient-to-r from-green-500 to-emerald-500"
                          : activity.status === "in_progress"
                          ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                          : "bg-gradient-to-r from-gray-400 to-slate-400"
                      }`}
                    />

                    <div className="p-5 dark:bg-[#1f1f1f]">
                      {/* Header com título e ações */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Ícone de status com fundo colorido */}
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                              activity.status === "completed"
                                ? "bg-green-100 text-green-600"
                                : activity.status === "in_progress"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {getStatusIcon(activity.status)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4
                              className={`font-semibold text-base leading-tight mb-1 ${
                                activity.priority === "high"
                                  ? "text-red-800 dark:text-red-300"
                                  : "text-gray-900 dark:text-white"
                              }`}
                            >
                              {activity.priority === "high" && (
                                <span className="inline-block mr-1 text-red-500">
                                  🔥
                                </span>
                              )}
                              {activity.title}
                            </h4>

                            {/* Responsável */}
                            {activity.profiles?.full_name && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                                👤 {activity.profiles.full_name}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Dropdown de ações */}
                        <div className="flex-shrink-0 ml-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-60 group-hover:opacity-100 transition-opacity"
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
                                    handleStatusChange(
                                      activity.id,
                                      "completed"
                                    );
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
                      </div>

                      {/* Descrição */}
                      {activity.description && (
                        <p
                          className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4 overflow-hidden"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {activity.description}
                        </p>
                      )}

                      {/* Footer com badges e informações */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Badge de prioridade */}
                          <Badge
                            variant={
                              activity.priority === "high"
                                ? "destructive"
                                : activity.priority === "medium"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs font-medium"
                          >
                            {activity.priority === "low"
                              ? "🟢 Baixa"
                              : activity.priority === "medium"
                              ? "🟡 Média"
                              : "🔴 Alta"}
                          </Badge>

                          {/* Badge de status */}
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              activity.status === "completed"
                                ? "border-green-300 bg-green-50 text-green-700"
                                : activity.status === "in_progress"
                                ? "border-blue-300 bg-blue-50 text-blue-700"
                                : "border-gray-300 bg-gray-50 text-gray-700"
                            }`}
                          >
                            {activity.status === "completed"
                              ? "✅ Concluída"
                              : activity.status === "in_progress"
                              ? "⏳ Em Andamento"
                              : "⏸️ Pendente"}
                          </Badge>
                        </div>

                        {/* Tempo estimado */}
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>
                            {activity.estimated_time
                              ? `${activity.estimated_time}h`
                              : "N/A"}
                          </span>
                        </div>
                      </div>

                      {/* Data de vencimento (se houver) */}
                      {activity.due_date && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-2 text-xs">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                new Date(activity.due_date) < new Date()
                                  ? "bg-red-400"
                                  : "bg-yellow-400"
                              }`}
                            />
                            <span
                              className={`font-medium ${
                                new Date(activity.due_date) < new Date()
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-yellow-600 dark:text-yellow-400"
                              }`}
                            >
                              Vence em:{" "}
                              {new Date(activity.due_date).toLocaleDateString(
                                "pt-BR"
                              )}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Preview de progresso das subtarefas */}
                      {activity.subtasks && activity.subtasks.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600 dark:text-gray-400 font-medium">
                                Subtarefas
                              </span>
                              <span className="text-[#09b230] font-semibold">
                                {
                                  activity.subtasks.filter(
                                    (s) => s.is_completed
                                  ).length
                                }
                                /{activity.subtasks.length}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-[#09b230] h-2 rounded-full transition-all duration-300"
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
                              />
                            </div>
                            <div className="text-xs text-center text-gray-600 dark:text-gray-400">
                              {Math.round(
                                activity.subtasks.length > 0
                                  ? (activity.subtasks.filter(
                                      (s) => s.is_completed
                                    ).length /
                                      activity.subtasks.length) *
                                      100
                                  : 0
                              )}
                              % concluído
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sombra de hover */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Circle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Clique em um dia do calendário para ver as atividades</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ActivityEditModal
        activity={editingActivity}
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        onSave={handleSaveActivity}
        onDelete={async (id) => {
          await archiveActivity(id);
          handleActivitySuccess();
        }}
        defaultDueDate={defaultActivityDate}
      />

      <ActivityDetailModal
        activity={detailActivity}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onRefresh={refetch}
      />
    </div>
  );
};
