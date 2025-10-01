import { useMemo, useState, useCallback, useEffect } from "react";
import "@/styles/scrollbar.css";
import { ActivityCalendar } from "@/components/calendar/ActivityCalendar";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { PersonalListsBoard } from "@/components/activities/PersonalListsBoard";
import { SubsectorCards } from "@/components/activities/SubsectorCards";
import { ActivityEditModal } from "@/components/activities/ActivityEditModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Subtask } from "@/hooks/useActivities";
import {
  CheckCircle,
  Clock,
  Circle,
  AlertTriangle,
  Calendar,
  LayoutGrid,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useIndexActivitiesStable } from "@/hooks/useIndexActivitiesStable";
import { useAuth } from "@/hooks/useAuthFinal";
import { useActivityOperations } from "@/hooks/useActivityOperations";
import { Activity } from "@/hooks/useActivities";

const IndexSimple = () => {
  const { profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const {
    activities: allActivities,
    loading,
    refetch,
  } = useIndexActivitiesStable();

  // Listen for drag and drop updates
  useEffect(() => {
    const handleActivitiesUpdate = () => {
      refetch();
    };

    window.addEventListener("activities-updated", handleActivitiesUpdate);
    return () => {
      window.removeEventListener("activities-updated", handleActivitiesUpdate);
    };
  }, [refetch]);

  // Filtrar atividades por mês atual
  const activities = useMemo(() => {
    if (!allActivities.length) return [];
    const monthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const monthEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    return allActivities.filter((activity) => {
      const createdDate = new Date(activity.created_at);
      return createdDate >= monthStart && createdDate <= monthEnd;
    });
  }, [allActivities, currentMonth]);
  const { createActivity, updateActivity, archiveActivity } =
    useActivityOperations();
  const { toast } = useToast();
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newActivitySubsector, setNewActivitySubsector] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [creatingListId, setCreatingListId] = useState<string | null>(null);
  const [activitiesMinimized, setActivitiesMinimized] = useState(false);

  const { todayStart, todayEnd } = useMemo(() => {
    const today = new Date();
    return {
      todayStart: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ),
      todayEnd: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      ),
    };
  }, []);

  const stats = useMemo(
    () => ({
      total: activities.length,
      pending: activities.filter((a) => a.status === "pending").length,
      in_progress: activities.filter((a) => a.status === "in_progress").length,
      completed: activities.filter((a) => a.status === "completed").length,
      today: activities.filter((a) => {
        const createdAt = new Date(a.created_at);
        return createdAt >= todayStart && createdAt < todayEnd;
      }).length,
      overdue: activities.filter((a) => {
        if (a.status === "completed" || !a.due_date) return false;
        return new Date(a.due_date) < new Date();
      }).length,
    }),
    [activities, todayStart, todayEnd]
  );

  const filteredActivities = useMemo(() => {
    if (!selectedFilter) return activities;

    switch (selectedFilter) {
      case "pending":
        return activities.filter((a) => a.status === "pending");
      case "in_progress":
        return activities.filter((a) => a.status === "in_progress");
      case "completed":
        return activities.filter((a) => a.status === "completed");
      case "today":
        return activities.filter((a) => {
          const createdAt = new Date(a.created_at);
          return createdAt >= todayStart && createdAt < todayEnd;
        });
      case "overdue":
        return activities.filter((a) => {
          if (a.status === "completed" || !a.due_date) return false;
          return new Date(a.due_date) < new Date();
        });
      default:
        return activities;
    }
  }, [activities, selectedFilter, todayStart, todayEnd]);

  // Navegação entre meses
  const navigateMonth = useCallback((direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  }, []);

  // Formatação do mês
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

  const currentMonthName = `${
    monthNames[currentMonth.getMonth()]
  } ${currentMonth.getFullYear()}`;

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p>Perfil não encontrado</p>
        </div>
      </div>
    );
  }

  const handleAddActivity = (subsectorId: string, subsectorName: string) => {
    setNewActivitySubsector({ id: subsectorId, name: subsectorName });
    setSelectedActivity(null);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const handleAddPersonalCard = (listId: string) => {
    setCreatingListId(listId);
    setNewActivitySubsector(null);
    setSelectedActivity(null);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsCreating(false);
    setIsModalOpen(true);
  };

  const handleSaveActivity = async (activityData: Partial<Activity>) => {
    // helper to normalize assignees payload coming from the modal
    const extractAssigneeIds = (data: Partial<Activity>) => {
      const raw = (data as unknown as { assignees?: unknown }).assignees;
      let ids: string[] = [];
      if (Array.isArray(raw)) {
        ids = raw
          .map((a) => {
            if (typeof a === "string") return a;
            if (a && typeof a === "object") {
              return (
                (a as { user_id?: string; id?: string }).user_id ??
                (a as { user_id?: string; id?: string }).id ??
                null
              );
            }
            return null;
          })
          .filter(Boolean) as string[];
      }
      return ids;
    };

    if (isCreating && (newActivitySubsector || creatingListId)) {
      // Do not override created_at — let server/db set the real creation timestamp
      const createData = {
        title: activityData.title || "",
        description: activityData.description,
        subsector_id: newActivitySubsector ? newActivitySubsector.id : null,
        due_date: activityData.due_date,
        priority: activityData.priority,
        status: activityData.status,
        user_id: activityData.user_id,
        is_private:
          (activityData as unknown as { is_private?: boolean }).is_private ??
          Boolean(creatingListId),
      };

      const assigneeIds = extractAssigneeIds(activityData);

      const success = await createActivity(createData);
      if (success) {
        // Salvar múltiplos responsáveis se houver
        if (assigneeIds.length > 0) {
          await saveMultipleAssignees(success.id, assigneeIds);
        }

        if (creatingListId) {
          await updateActivity({ id: success.id, list_id: creatingListId });
          window.dispatchEvent(
            new CustomEvent("personal-list-updated", {
              detail: { listId: creatingListId },
            })
          );
        }
        if (activityData.subtasks && activityData.subtasks.length > 0) {
          await saveActivitySubtasks(success.id, activityData.subtasks);
          if (creatingListId) {
            window.dispatchEvent(
              new CustomEvent("personal-list-force-reload", {
                detail: { listId: creatingListId },
              })
            );
          }
        }
        // Force immediate refresh
        refetch();
        setIsModalOpen(false);
        setNewActivitySubsector(null);
        setCreatingListId(null);
      }
    } else if (selectedActivity) {
      const updateData = {
        id: selectedActivity.id,
        title: activityData.title,
        description: activityData.description,
        due_date: activityData.due_date,
        priority: activityData.priority,
        status: activityData.status,
        user_id: activityData.user_id,
        is_private: (activityData as unknown as { is_private?: boolean })
          .is_private,
      };

      const assigneeIds = extractAssigneeIds(activityData);

      const success = await updateActivity(updateData);
      if (success) {
        // Atualizar múltiplos responsáveis
        if (assigneeIds.length > 0) {
          await saveMultipleAssignees(selectedActivity.id, assigneeIds);
        }
        if (activityData.subtasks) {
          await saveActivitySubtasks(
            selectedActivity.id,
            activityData.subtasks
          );
          if (selectedActivity.list_id) {
            window.dispatchEvent(
              new CustomEvent("personal-list-force-reload", {
                detail: { listId: selectedActivity.list_id },
              })
            );
          }
        }
        if (selectedActivity.list_id) {
          window.dispatchEvent(
            new CustomEvent("personal-list-updated", {
              detail: { listId: selectedActivity.list_id },
            })
          );
        }
        // Force immediate refresh
        refetch();
        setIsModalOpen(false);
      }
    }
  };

  const saveMultipleAssignees = async (
    activityId: string,
    assigneeIds: string[]
  ) => {
    // Simplified - just update the main user_id for now
    console.log("Multiple assignees:", assigneeIds);
  };

  const saveActivitySubtasks = async (
    activityId: string,
    subtasks: Subtask[]
  ) => {
    try {
      await supabase.from("subtasks").delete().eq("activity_id", activityId);

      if (subtasks.length > 0) {
        const subtasksToInsert = subtasks.map((subtask, index) => ({
          activity_id: activityId,
          title: subtask.title,
          is_completed: subtask.is_completed,
          order_index: index,
          checklist_group: subtask.checklist_group || null,
        }));

        const { error } = await supabase
          .from("subtasks")
          .insert(subtasksToInsert);
        if (error) throw error;
      }
    } catch (error) {
      console.error("Erro ao salvar subtasks:", error);
      toast({
        title: "Erro ao salvar checklist",
        description: "Não foi possível salvar os itens do checklist.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    await archiveActivity(activityId);
    const listId = selectedActivity?.list_id || creatingListId || null;
    if (listId) {
      window.dispatchEvent(
        new CustomEvent("personal-list-updated", { detail: { listId } })
      );
    }
    // Force immediate refresh
    refetch();
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 overflow-x-hidden">
      {/* Header Section */}
      <div className="space-y-4">
        {/* Title and Calendar Button Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth("prev")}
              className="h-7 w-7 p-0 sm:h-8 sm:w-8"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-[#09b230] to-[#4ade80] bg-clip-text text-transparent">
              {currentMonthName}
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth("next")}
              className="h-7 w-7 p-0 sm:h-8 sm:w-8"
            >
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
          <Button
            variant={showCalendar ? "default" : "outline"}
            onClick={() => setShowCalendar(!showCalendar)}
            size="sm"
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            {showCalendar ? (
              <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
            ) : (
              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
            <span className="hidden sm:inline">
              {showCalendar ? "Ocultar" : "Mostrar"} Calendário
            </span>
            <span className="sm:hidden">
              {showCalendar ? "Ocultar" : "Calendário"}
            </span>
          </Button>
        </div>

        {/* Subtitle */}
        <p className="text-muted-foreground text-xs sm:text-sm">
          Gerencie suas atividades em um board Kanban organizado por subsetores
        </p>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-1 sm:gap-2">
          <button
            onClick={() =>
              setSelectedFilter(selectedFilter === null ? null : null)
            }
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              selectedFilter === null
                ? "bg-blue-600 dark:bg-blue-500 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() =>
              setSelectedFilter(selectedFilter === "pending" ? null : "pending")
            }
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              selectedFilter === "pending"
                ? "bg-blue-500 text-white shadow-md"
                : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() =>
              setSelectedFilter(
                selectedFilter === "in_progress" ? null : "in_progress"
              )
            }
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              selectedFilter === "in_progress"
                ? "bg-yellow-500 text-white shadow-md"
                : "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800"
            }`}
          >
            <span className="hidden sm:inline">Em Andamento</span>
            <span className="sm:hidden">Andamento</span>
          </button>
          <button
            onClick={() =>
              setSelectedFilter(
                selectedFilter === "completed" ? null : "completed"
              )
            }
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              selectedFilter === "completed"
                ? "bg-green-500 text-white shadow-md"
                : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800"
            }`}
          >
            Concluídas
          </button>
          <button
            onClick={() =>
              setSelectedFilter(selectedFilter === "overdue" ? null : "overdue")
            }
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              selectedFilter === "overdue"
                ? "bg-red-500 text-white shadow-md"
                : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800"
            }`}
          >
            Atrasadas
          </button>
          <button
            onClick={() =>
              setSelectedFilter(selectedFilter === "today" ? null : "today")
            }
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              selectedFilter === "today"
                ? "bg-purple-500 text-white shadow-md"
                : "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800"
            }`}
          >
            Hoje
          </button>
        </div>
      </div>

      {/* Calendar Section */}
      {showCalendar && (
        <div className="border rounded-lg p-4 bg-card shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Calendário</h2>
          </div>
          <ActivityCalendar />
        </div>
      )}

      {/* Activities Section */}
      <div className={activitiesMinimized ? "" : "min-h-[60vh]"}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Atividades
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActivitiesMinimized(!activitiesMinimized)}
            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div
              className={`transition-transform duration-300 ease-in-out ${
                activitiesMinimized ? "rotate-0" : "rotate-180"
              }`}
            >
              <ChevronDown className="h-4 w-4" />
            </div>
            <span className="text-xs transition-all duration-200">
              {activitiesMinimized ? "Expandir" : "Minimizar"}
            </span>
          </Button>
        </div>

        <div
          className={`transition-all duration-500 ease-in-out transform ${
            activitiesMinimized
              ? "max-h-0 opacity-0 overflow-hidden scale-y-95 -translate-y-2"
              : "max-h-none opacity-100 scale-y-100 translate-y-0"
          }`}
        >
          <div className="pb-4">
            <SubsectorCards
              activities={filteredActivities}
              onAddActivity={handleAddActivity}
              onEditActivity={handleEditActivity}
              hideEmpty={Boolean(selectedFilter)}
            />
          </div>
        </div>

        <PersonalListsBoard
          onCreateCard={handleAddPersonalCard}
          onEditCard={handleEditActivity}
          statusFilter={
            selectedFilter === "pending" ||
            selectedFilter === "in_progress" ||
            selectedFilter === "completed" ||
            selectedFilter === "archived"
              ? (selectedFilter as
                  | "pending"
                  | "in_progress"
                  | "completed"
                  | "archived")
              : null
          }
          monthStart={
            new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
          }
          monthEnd={
            new Date(
              currentMonth.getFullYear(),
              currentMonth.getMonth() + 1,
              0,
              23,
              59,
              59
            )
          }
        />
      </div>

      <ActivityEditModal
        activity={isCreating ? null : selectedActivity}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setNewActivitySubsector(null);
          setCreatingListId(null);
          setIsCreating(false);
        }}
        onSave={handleSaveActivity}
        onDelete={handleDeleteActivity}
        subsectorId={newActivitySubsector?.id}
        isCreatingForPrivateList={Boolean(creatingListId)}
      />
    </div>
  );
};

export default IndexSimple;
