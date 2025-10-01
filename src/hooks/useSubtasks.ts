import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Subtask } from "@/hooks/useActivities";

export const useSubtasks = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addSubtask = useCallback(
    async (activityId: string, title: string, description?: string) => {
      setLoading(true);
      try {
        // Get the next order index
        const { data: existingSubtasks } = await supabase
          .from("subtasks")
          .select("order_index")
          .eq("activity_id", activityId)
          .order("order_index", { ascending: false })
          .limit(1);

        const nextOrderIndex =
          existingSubtasks && existingSubtasks.length > 0
            ? existingSubtasks[0].order_index + 1
            : 0;

        const { error } = await supabase.from("subtasks").insert({
          activity_id: activityId,
          title,
          description,
          order_index: nextOrderIndex,
        });

        if (error) throw error;

        toast({
          title: "Subtarefa adicionada",
          description: "A subtarefa foi criada com sucesso.",
        });

        return true;
      } catch (error) {
        console.error("Error adding subtask:", error);
        toast({
          title: "Erro",
          description: "Não foi possível adicionar a subtarefa.",
          variant: "destructive",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const updateSubtask = useCallback(
    async (
      subtaskId: string,
      updates: Partial<Pick<Subtask, "title" | "description" | "is_completed">>
    ) => {
      setLoading(true);
      try {
        const { error } = await supabase
          .from("subtasks")
          .update(updates)
          .eq("id", subtaskId);

        if (error) throw error;

        if (updates.is_completed !== undefined) {
          toast({
            title: updates.is_completed
              ? "Subtarefa concluída"
              : "Subtarefa desmarcada",
            description: updates.is_completed
              ? "A atividade foi movida para 'Em Andamento'."
              : "Status da subtarefa atualizado.",
          });
        } else {
          toast({
            title: "Subtarefa atualizada",
            description: "As alterações foram salvas com sucesso.",
          });
        }

        return true;
      } catch (error) {
        console.error("Error updating subtask:", error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar a subtarefa.",
          variant: "destructive",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const deleteSubtask = useCallback(
    async (subtaskId: string) => {
      setLoading(true);
      try {
        const { error } = await supabase
          .from("subtasks")
          .delete()
          .eq("id", subtaskId);

        if (error) throw error;

        toast({
          title: "Subtarefa removida",
          description: "A subtarefa foi excluída com sucesso.",
        });

        return true;
      } catch (error) {
        console.error("Error deleting subtask:", error);
        toast({
          title: "Erro",
          description: "Não foi possível remover a subtarefa.",
          variant: "destructive",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const reorderSubtasks = useCallback(
    async (subtasks: { id: string; order_index: number }[]) => {
      setLoading(true);
      try {
        const updates = subtasks.map(({ id, order_index }) =>
          supabase.from("subtasks").update({ order_index }).eq("id", id)
        );

        await Promise.all(updates);

        return true;
      } catch (error) {
        console.error("Error reordering subtasks:", error);
        toast({
          title: "Erro",
          description: "Não foi possível reordenar as subtarefas.",
          variant: "destructive",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  return {
    loading,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    reorderSubtasks,
  };
};
