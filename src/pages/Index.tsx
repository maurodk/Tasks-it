import { useMemo, useState } from "react";
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
} from "lucide-react";
import { useIndexActivities } from "@/hooks/useIndexActivities";
import { useAuth } from "@/hooks/useAuth";
import { useActivityOperations } from "@/hooks/useActivityOperations";
import { Activity } from "@/hooks/useActivities";

const Index = () => {
  const { profile } = useAuth();
  const { activities, loading, refetch } = useIndexActivities();
  const [currentMonth] = useState(new Date());
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

  // Memoizar as datas para evitar recriação em cada render
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

  // Conjunto de atividades realmente visíveis na Home (mesma regra do useIndexActivities)
  const visibleActivities = useMemo(() => activities, [activities]);

  const stats = useMemo(
    () => ({
      total: visibleActivities.length,
      pending: visibleActivities.filter((a) => a.status === "pending").length,
      in_progress: visibleActivities.filter((a) => a.status === "in_progress")
        .length,
      completed: visibleActivities.filter((a) => a.status === "completed")
        .length,
      today: visibleActivities.filter((a) => {
        const createdAt = new Date(a.created_at);
        return createdAt >= todayStart && createdAt < todayEnd;
      }).length,
      overdue: visibleActivities.filter((a) => {
        if (a.status === "completed" || !a.due_date) return false;
        return new Date(a.due_date) < new Date();
      }).length,
    }),
    [visibleActivities, todayStart, todayEnd]
  );

  // Filtrar atividades baseado no filtro selecionado
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

  // Se não há perfil, mostrar indicador de carregamento
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="text-center space-y-4 glass-effect p-8 rounded-2xl">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Mostrar estado de carregamento enquanto as atividades estão sendo carregadas
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="text-center space-y-4 glass-effect p-8 rounded-2xl">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Carregando atividades...</p>
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

  // Create inside personal list (no subsector)
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
    if (isCreating && (newActivitySubsector || creatingListId)) {
      // Criar nova atividade
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

      // If creating for personal list, also set list_id after creation
      const success = await createActivity(createData);
      if (success) {
        if (creatingListId) {
          // Primeiro definir o list_id
          await updateActivity({ id: success.id, list_id: creatingListId });

          // Depois salvar as subtasks
          if (activityData.subtasks && activityData.subtasks.length > 0) {
            await saveActivitySubtasks(success.id, activityData.subtasks);
          }
          // Disparar atualização explícita do board da lista privada
          window.dispatchEvent(
            new CustomEvent("personal-list-force-reload", {
              detail: { listId: creatingListId },
            })
          );
        } else {
          // Se não é lista privada, salvar subtasks normalmente
          if (activityData.subtasks && activityData.subtasks.length > 0) {
            await saveActivitySubtasks(success.id, activityData.subtasks);
          }
          await refetch();
        }

        // Fechar modal apenas após tudo estar completo
        setIsModalOpen(false);
        setNewActivitySubsector(null);
        setCreatingListId(null);
      }
    } else if (selectedActivity) {
      // Atualizar atividade existente
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

      const success = await updateActivity(updateData);
      if (success) {
        // Salvar subtasks se houver
        if (activityData.subtasks) {
          await saveActivitySubtasks(
            selectedActivity.id,
            activityData.subtasks
          );

          if (selectedActivity.list_id) {
            // Disparar evento APENAS após salvar subtasks
            window.dispatchEvent(
              new CustomEvent("personal-list-updated", {
                detail: { listId: selectedActivity.list_id },
              })
            );
          }
        } else if (selectedActivity.list_id) {
          // Se não tem subtasks, disparar evento normalmente
          window.dispatchEvent(
            new CustomEvent("personal-list-updated", {
              detail: { listId: selectedActivity.list_id },
            })
          );
        }
        // Aguardar atualização completa
        await refetch();
        setIsModalOpen(false);
      }
    }
  };

  // Função para salvar subtasks
  const saveActivitySubtasks = async (
    activityId: string,
    subtasks: Subtask[]
  ) => {
    try {
      console.log("saveActivitySubtasks called with:", {
        activityId,
        subtasks,
      });

      // Primeiro, remover todas as subtasks existentes
      const { error: deleteError } = await supabase
        .from("subtasks")
        .delete()
        .eq("activity_id", activityId);
      if (deleteError) {
        console.error("Error deleting existing subtasks:", deleteError);
        throw deleteError;
      }

      // Depois, inserir as novas subtasks
      if (subtasks.length > 0) {
        const subtasksToInsert = subtasks
          .filter((subtask) => subtask.title.trim()) // Filtrar apenas subtasks com título
          .map((subtask, index) => ({
            activity_id: activityId,
            title: subtask.title,
            is_completed: subtask.is_completed,
            order_index: index,
            checklist_group: subtask.checklist_group || null,
          }));

        console.log("Inserting subtasks:", subtasksToInsert);

        if (subtasksToInsert.length > 0) {
          const { error } = await supabase
            .from("subtasks")
            .insert(subtasksToInsert);

          if (error) {
            console.error("Error inserting subtasks:", error);
            throw error;
          }
          console.log("Subtasks inserted successfully");
        }
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
    await refetch();
    // Fire event for personal list boards too
    const listId = selectedActivity?.list_id || creatingListId || null;
    if (listId) {
      window.dispatchEvent(
        new CustomEvent("personal-list-updated", { detail: { listId } })
      );
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex items-center justify-between sticky top-0 z-10 py-3">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#09b230] to-[#4ade80] bg-clip-text text-transparent">
            Sistema de Atividades
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Gerencie suas atividades em um board Kanban organizado por
            subsetores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showCalendar ? "default" : "outline"}
            onClick={() => setShowCalendar(!showCalendar)}
            className="flex items-center gap-2"
          >
            {showCalendar ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {showCalendar ? "Ocultar" : "Mostrar"} Calendário
          </Button>
        </div>
      </div>

      {showCalendar && (
        <div className="glass-effect rounded-3xl p-6 border border-border/50 dark:bg-[#0f0f0f]">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Calendário</h2>
          </div>
          <ActivityCalendar />
        </div>
      )}

      {/* KPIs - Filtros Minimalistas */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() =>
            setSelectedFilter(selectedFilter === null ? null : null)
          }
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            selectedFilter === null
              ? "bg-blue-600 dark:bg-blue-500 text-white shadow-md"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Todas ({stats.total})
        </button>

        <button
          onClick={() =>
            setSelectedFilter(selectedFilter === "pending" ? null : "pending")
          }
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            selectedFilter === "pending"
              ? "bg-blue-500 text-white shadow-md"
              : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800"
          }`}
        >
          Pendentes ({stats.pending})
        </button>

        <button
          onClick={() =>
            setSelectedFilter(
              selectedFilter === "in_progress" ? null : "in_progress"
            )
          }
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            selectedFilter === "in_progress"
              ? "bg-yellow-500 text-white shadow-md"
              : "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800"
          }`}
        >
          Em Andamento ({stats.in_progress})
        </button>

        <button
          onClick={() =>
            setSelectedFilter(
              selectedFilter === "completed" ? null : "completed"
            )
          }
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            selectedFilter === "completed"
              ? "bg-green-500 text-white shadow-md"
              : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800"
          }`}
        >
          Concluídas ({stats.completed})
        </button>

        <button
          onClick={() =>
            setSelectedFilter(selectedFilter === "overdue" ? null : "overdue")
          }
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            selectedFilter === "overdue"
              ? "bg-red-500 text-white shadow-md"
              : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800"
          }`}
        >
          Atrasadas ({stats.overdue})
        </button>

        <button
          onClick={() =>
            setSelectedFilter(selectedFilter === "today" ? null : "today")
          }
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            selectedFilter === "today"
              ? "bg-purple-500 text-white shadow-md"
              : "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800"
          }`}
        >
          Hoje ({stats.today})
        </button>
      </div>

      {/* Cartões flutuando (sem board) */}
      <div className="min-h-[60vh]">
        <div className="flex items-center gap-2 mb-3">
          <LayoutGrid className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {selectedFilter
              ? `Atividades (${filteredActivities.length})`
              : `Atividades (${stats.total})`}
          </h2>
        </div>

        <SubsectorCards
          activities={filteredActivities}
          onAddActivity={handleAddActivity}
          onEditActivity={handleEditActivity}
          hideEmpty={Boolean(selectedFilter)}
        />

        {/* Personal private boards */}
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

      {/* Calendar section rendered above when toggled */}

      {/* Modal de Edição */}
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
        isCreatingForPrivateList={Boolean(creatingListId)}
      />
    </div>
  );
};

export default Index;
