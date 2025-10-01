import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
// Floating cards layout identical to dashboard
import { ActivityCard } from "@/components/activities/ActivityCard";
import { CollaboratorCards } from "@/components/activities/CollaboratorCards";
import { ActivityEditModal } from "@/components/activities/ActivityEditModal";
import { useActivities } from "@/hooks/useActivities";
import { useActivityOperations } from "@/hooks/useActivityOperations";

import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, LayoutGrid } from "lucide-react";
import { Activity, Subtask } from "@/hooks/useActivities";

interface SubsectorData {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

const Subsector = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subsector, setSubsector] = useState<SubsectorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // No collaborator grouping here; just create for this subsetor

  const { createActivity, updateActivity, archiveActivity } =
    useActivityOperations();

  // Estabilizar as options para evitar re-renders infinitos
  const activitiesOptions = useMemo(
    () => ({
      subsectorId: id,
      status: ["pending", "in_progress", "completed"] as Array<
        "pending" | "in_progress" | "completed"
      >,
    }),
    [id]
  );

  const {
    activities,
    loading: activitiesLoading,
    refetch,
  } = useActivities(activitiesOptions);

  useEffect(() => {
    if (!id) return;

    const fetchSubsector = async () => {
      try {
        const { data, error } = await supabase
          .from("subsectors")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setSubsector(data);
      } catch (error) {
        console.error("Error fetching subsector:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubsector();
  }, [id]);

  const [assignee, setAssignee] = useState<{ id: string; name: string } | null>(
    null
  );
  const handleAddActivity = (userId?: string, userName?: string) => {
    setSelectedActivity(null);
    setIsCreating(true);
    setAssignee(userId ? { id: userId, name: userName || "" } : null);
    setIsModalOpen(true);
  };

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsCreating(false);
    setIsModalOpen(true);
  };

  const handleSaveActivity = async (activityData: Partial<Activity>) => {
    if (isCreating && id) {
      // Criar nova atividade
      const createData = {
        title: activityData.title || "",
        description: activityData.description,
        subsector_id: id,
        due_date: activityData.due_date,
        priority: activityData.priority,
        status: activityData.status,
        user_id: assignee?.id,
      };

      const success = await createActivity(createData);
      if (success) {
        // Salvar múltiplos responsáveis se houver
        if (activityData.assignee_ids && activityData.assignee_ids.length > 0) {
          await saveMultipleAssignees(success.id, activityData.assignee_ids);
        }
        // Se a atividade foi criada e tem subtasks, salvar as subtasks
        if (activityData.subtasks && activityData.subtasks.length > 0) {
          await saveActivitySubtasks(success.id, activityData.subtasks);
        }
        // Forçar atualização imediata
        refetch();
        setIsModalOpen(false);
        setAssignee(null);
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
      };

      const success = await updateActivity(updateData);
      if (success) {
        // Salvar múltiplos responsáveis se houver
        if (activityData.assignee_ids) {
          await saveMultipleAssignees(selectedActivity.id, activityData.assignee_ids);
        }
        // Salvar subtasks se houver
        if (activityData.subtasks) {
          await saveActivitySubtasks(
            selectedActivity.id,
            activityData.subtasks
          );
        }
        // Forçar atualização imediata
        refetch();
        setIsModalOpen(false);
      }
    }
  };

  // Função para salvar múltiplos responsáveis
  const saveMultipleAssignees = async (
    activityId: string,
    assigneeIds: string[]
  ) => {
    try {
      // Remover responsáveis existentes
      await supabase
        .from("activity_assignees")
        .delete()
        .eq("activity_id", activityId);

      // Inserir novos responsáveis
      if (assigneeIds.length > 0) {
        const { error } = await supabase
          .from("activity_assignees")
          .insert(
            assigneeIds.map(userId => ({
              activity_id: activityId,
              user_id: userId
            }))
          );

        if (error) throw error;
      }
    } catch (error) {
      console.error("Erro ao salvar responsáveis:", error);
      toast({
        title: "Erro ao salvar responsáveis",
        description: "Não foi possível salvar os responsáveis da atividade.",
        variant: "destructive",
      });
    }
  };

  // Função para salvar subtasks
  const saveActivitySubtasks = async (
    activityId: string,
    subtasks: Subtask[]
  ) => {
    try {
      // Primeiro, remover todas as subtasks existentes
      await supabase.from("subtasks").delete().eq("activity_id", activityId);

      // Depois, inserir as novas subtasks
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
    await refetch();
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!subsector) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            Subsetor não encontrado
          </h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              O subsetor que você está procurando não foi encontrado.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/")}
            >
              Voltar ao Calendário Principal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header (title and optional description only) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#09b230] to-[#4ade80] bg-clip-text text-transparent">
              {subsector.name}
            </h1>
            {subsector.description && (
              <p className="text-muted-foreground mt-2 text-lg">
                {subsector.description}
              </p>
            )}
          </div>
        </div>
        {/* No extra controls here to keep it minimal */}
      </div>
      {/* Quadro por colaborador (somente usuários deste subsetor) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Por Colaborador
            </h2>
          </div>
        </div>
        <CollaboratorCards
          activities={activities}
          onEditActivity={handleEditActivity}
          subsectorId={id || ""}
          onAddActivity={(userId, userName) =>
            handleAddActivity(userId, userName)
          }
        />
      </div>

      {/* Modal de Edição */}
      <ActivityEditModal
        activity={isCreating ? null : selectedActivity}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIsCreating(false);
          setAssignee(null);
        }}
        onSave={handleSaveActivity}
        onDelete={handleDeleteActivity}
        subsectorId={id}
      />
    </div>
  );
};

export default Subsector;
