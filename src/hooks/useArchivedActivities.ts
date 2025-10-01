import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuthFinal";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/types/supabase";

// Tipos específicos para atividades arquivadas
type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type ProfileData = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "avatar_url"
>;
type SubsectorData = Pick<
  Database["public"]["Tables"]["subsectors"]["Row"],
  "name"
>;

type SubtaskRow = Database["public"]["Tables"]["subtasks"]["Row"];

export type Subtask = SubtaskRow & {
  checklist_group?: string;
};

export type ArchivedActivity = ActivityRow & {
  profiles?: ProfileData | null;
  subsectors?: SubsectorData | null;
  subtasks?: Subtask[];
  activity_history?: {
    id: string;
    action: string;
    created_at: string;
    performed_by?: string;
  }[];
};

/**
 * Hook específico para gerenciar APENAS atividades arquivadas
 * Não usa subscription em tempo real para evitar refetch automático
 */
export function useArchivedActivities() {
  const [activities, setActivities] = useState<ArchivedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchArchivedActivities = useCallback(async () => {
    if (!profile?.sector_id) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("activities")
        .select(
          `
          *,
          profiles (
            full_name,
            avatar_url
          ),
          subsectors (
            name
          ),
          subtasks (
            id,
            activity_id,
            title,
            description,
            is_completed,
            checklist_group,
            order_index,
            created_at,
            updated_at
          ),
          activity_history (
            id,
            action,
            created_at,
            performed_by
          )
        `
        )
        .eq("sector_id", profile.sector_id)
        .eq("status", "archived")
        .order("created_at", { ascending: false });

      if (profile.role === "collaborator") {
        // Buscar subsetores do colaborador
        // supabase types for this project may not include profile_subsectors, cast to any
        const { data: userSubsectors } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from("profile_subsectors" as any)
          .select("subsector_id")
          .eq("profile_id", profile.id);

        // cast to any to avoid TS mismatch from generated supabase types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subsectorIds =
          (userSubsectors as any)?.map((ps: any) => ps.subsector_id) || [];

        // Construir filtro para múltiplos subsetores
        if (subsectorIds.length > 0) {
          query = query.in("subsector_id", subsectorIds);
        } else if (profile.subsector_id) {
          // Fallback para subsetor principal
          query = query.eq("subsector_id", profile.subsector_id);
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setActivities((data as unknown as ArchivedActivity[]) || []);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
      toast({
        title: "Erro ao carregar atividades arquivadas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [profile, toast]);

  const deleteActivity = useCallback(
    async (activityId: string) => {
      try {
        // Primeiro deletar subtasks
        const { error: subtasksError } = await supabase
          .from("subtasks")
          .delete()
          .eq("activity_id", activityId);

        if (subtasksError) {
          console.warn("Erro ao deletar subtasks:", subtasksError);
        }

        // Depois deletar a atividade
        const { error } = await supabase
          .from("activities")
          .delete()
          .eq("id", activityId);

        if (error) throw error;

        // Atualizar estado local imediatamente
        setActivities((prev) =>
          prev.filter((activity) => activity.id !== activityId)
        );

        toast({
          title: "Atividade excluída",
          description: "A atividade foi excluída permanentemente.",
        });
      } catch (err: unknown) {
        const error = err as Error;
        toast({
          title: "Erro ao excluir atividade",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const unarchiveActivity = useCallback(
    async (
      activityId: string,
      newStatus: "pending" | "in_progress" = "pending"
    ) => {
      try {
        const { error } = await supabase
          .from("activities")
          .update({ status: newStatus })
          .eq("id", activityId);

        if (error) throw error;

        // Remove from local state
        setActivities((prev) =>
          prev.filter((activity) => activity.id !== activityId)
        );

        toast({
          title: "Atividade recuperada",
          description: `A atividade foi restaurada como ${
            newStatus === "pending" ? "Pendente" : "Em Andamento"
          }.`,
        });
      } catch (err: unknown) {
        const error = err as Error;
        toast({
          title: "Erro ao recuperar atividade",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  // Fetch inicial apenas
  useEffect(() => {
    fetchArchivedActivities();
  }, [fetchArchivedActivities]);

  // Subscription em tempo real: atualizar quando atividades mudarem
  useEffect(() => {
    if (!profile?.sector_id) return;

    const channel = supabase
      .channel(`archived_activities_${profile.sector_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activities",
          filter: `sector_id=eq.${profile.sector_id}`,
        },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            fetchArchivedActivities();
          }, 400);
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [profile?.sector_id, fetchArchivedActivities]);

  // SEM subscription em tempo real para evitar refetch automático

  return {
    activities,
    loading,
    error,
    deleteActivity,
    unarchiveActivity,
    refetch: fetchArchivedActivities,
  };
}
