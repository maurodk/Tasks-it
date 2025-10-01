import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Activity } from "@/hooks/useActivities";
import { useAuth } from "@/hooks/useAuthFinal";
import { Database } from "@/types/supabase";

type ActivityStatus = "pending" | "in_progress" | "completed" | "archived";

interface CreateActivityData {
  title: string;
  description?: string;
  subsector_id: string | null;
  due_date?: string;
  priority?: "low" | "medium" | "high";
  status?: ActivityStatus;
  // Optionally assign to a specific user (defaults to current user)
  user_id?: string;
  // Optional privacy flag
  is_private?: boolean;
  // Optional custom creation date
  created_at?: string;
}

interface UpdateActivityData extends Partial<CreateActivityData> {
  id: string;
  list_id?: string | null;
}

export function useActivityOperations() {
  const { toast } = useToast();
  const { profile, user } = useAuth();

  const createActivity = useCallback(
    async (data: CreateActivityData): Promise<Activity | null> => {
      try {
        if (!user?.id || !profile?.sector_id) {
          throw new Error("Usuário não autenticado");
        }

        const activityData: Database["public"]["Tables"]["activities"]["Insert"] =
          {
            title: data.title,
            description: data.description || "",
            subsector_id: data.subsector_id,
            due_date: data.due_date || null,
            priority: data.priority || "medium",
            status: data.status || "pending",
            created_by: user.id,
            user_id: data.user_id ?? user.id,
            sector_id: profile.sector_id,
            is_private: data.is_private ?? false,
            created_at: data.created_at || new Date().toISOString(),
          };

        const { data: activity, error } = await supabase
          .from("activities")
          .insert(activityData)
          .select("*")
          .single();

        if (error) throw error;

        toast({
          title: "Atividade criada",
          description: "Nova atividade foi criada com sucesso.",
        });

        // Trigger real-time update
        window.dispatchEvent(new CustomEvent("activity-created", { detail: activity }));
        
        return activity as unknown as Activity;
      } catch (error) {
        console.error("Erro ao criar atividade:", error);
        toast({
          title: "Erro ao criar atividade",
          description: "Não foi possível criar a atividade.",
          variant: "destructive",
        });
        return null;
      }
    },
    [toast, user, profile]
  );

  const updateActivity = useCallback(
    async (data: UpdateActivityData): Promise<boolean> => {
      try {
        const updateData: Record<string, unknown> = { ...data };
        delete updateData.id;

        if (data.status === "completed" && !updateData.completed_at) {
          updateData.completed_at = new Date().toISOString();
        } else if (data.status !== "completed") {
          updateData.completed_at = null;
        }

        const { error } = await supabase
          .from("activities")
          .update(updateData)
          .eq("id", data.id);

        if (error) throw error;

        toast({
          title: "Atividade atualizada",
          description: "As alterações foram salvas com sucesso.",
        });

        // Trigger real-time update
        window.dispatchEvent(new CustomEvent("activity-updated", { detail: { id: data.id, ...updateData } }));
        
        return true;
      } catch (error) {
        console.error("Erro ao atualizar atividade:", error);
        toast({
          title: "Erro ao atualizar atividade",
          description: "Não foi possível salvar as alterações.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast]
  );

  const deleteActivity = useCallback(
    async (activityId: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from("activities")
          .delete()
          .eq("id", activityId);

        if (error) throw error;

        toast({
          title: "Atividade excluída",
          description: "A atividade foi removida com sucesso.",
        });

        return true;
      } catch (error) {
        console.error("Erro ao excluir atividade:", error);
        toast({
          title: "Erro ao excluir atividade",
          description: "Não foi possível remover a atividade.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast]
  );

  const updateActivityStatus = useCallback(
    async (activityId: string, status: ActivityStatus) => {
      try {
        const updateData: {
          status: ActivityStatus;
          completed_at?: string | null;
        } = { status };

        if (status === "completed") {
          updateData.completed_at = new Date().toISOString();
        } else {
          updateData.completed_at = null;
        }

        const { error } = await supabase
          .from("activities")
          .update(updateData)
          .eq("id", activityId);

        if (error) throw error;

        // Criar histórico se foi arquivada
        if (status === "archived" && user?.id) {
          await supabase
            .from("activity_history")
            .insert({
              activity_id: activityId,
              action: "archived",
              performed_by: user.id,
              details: `Atividade arquivada por ${profile?.full_name || 'usuário'}`
            });
        }

        toast({
          title: "Atividade atualizada",
          description: `Status alterado para ${getStatusLabel(status)}.`,
        });

        // Trigger real-time update
        window.dispatchEvent(new CustomEvent("activity-updated", { detail: { id: activityId, status, completed_at: updateData.completed_at } }));
        
        return true;
      } catch (error) {
        console.error("Erro ao atualizar atividade:", error);
        toast({
          title: "Erro ao atualizar atividade",
          description: "Não foi possível atualizar o status da atividade.",
          variant: "destructive",
        });
        return false;
      }
    },
    [toast, user, profile]
  );

  const archiveActivity = useCallback(
    async (activityId: string) => {
      return updateActivityStatus(activityId, "archived");
    },
    [updateActivityStatus]
  );

  const unarchiveActivity = useCallback(
    async (activityId: string) => {
      return updateActivityStatus(activityId, "pending");
    },
    [updateActivityStatus]
  );

  return {
    createActivity,
    updateActivity,
    deleteActivity,
    updateActivityStatus,
    archiveActivity,
    unarchiveActivity,
  };
}

function getStatusLabel(status: ActivityStatus): string {
  const statusLabels: Record<ActivityStatus, string> = {
    pending: "Pendente",
    in_progress: "Em andamento",
    completed: "Concluída",
    archived: "Arquivada",
  };
  return statusLabels[status];
}
