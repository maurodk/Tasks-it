import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/types/supabase";

// 1. Tipo 'Activity' aprimorado e derivado do Supabase
type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type SubtaskRow = Database["public"]["Tables"]["subtasks"]["Row"];
type ProfileData = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "avatar_url"
>;
type SubsectorData = Pick<
  Database["public"]["Tables"]["subsectors"]["Row"],
  "name"
>;

export type Subtask = SubtaskRow & {
  checklist_group?: string;
};

export type Activity = ActivityRow & {
  profiles?: ProfileData | null;
  subsectors?: SubsectorData | null;
  subtasks?: Subtask[];
  assignees?: Array<{ user_id: string; profiles: ProfileData }>;
};

// 2. Tipo 'ActivityStatus' derivado diretamente do Enum do DB
type ActivityStatus = Database["public"]["Enums"]["activity_status"];

interface UseActivitiesOptions {
  subsectorId?: string;
  userId?: string;
  status?: ActivityStatus[];
  includeArchived?: boolean; // Nova opção para incluir arquivadas
}

export type { UseActivitiesOptions };

export function useActivities(options: UseActivitiesOptions = {}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const fetchActivities = useCallback(async () => {
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
          activity_assignees (
            user_id,
            profiles (
              full_name,
              avatar_url
            )
          )
        `
        )
        .eq("sector_id", profile.sector_id)
        .order("created_at", { ascending: false });

      // Aplicar filtros baseados no role e opções
      if (options.subsectorId) {
        query = query.eq("subsector_id", options.subsectorId);
      } else if (profile.role === "collaborator") {
        // Buscar subsetores do colaborador
        const { data: userSubsectors } = await supabase
          .from("profile_subsectors")
          .select("subsector_id")
          .eq("profile_id", profile.id);

        const subsectorIds = userSubsectors?.map(ps => ps.subsector_id) || [];
        
        // Se tem múltiplos subsetores, usar eles
        if (subsectorIds.length > 0) {
          query = query.in("subsector_id", subsectorIds);
        } else if (profile.subsector_id) {
          // Senão, usar o subsetor principal
          query = query.eq("subsector_id", profile.subsector_id);
        }
      }

      if (options.userId) {
        query = query.eq("user_id", options.userId);
      }

      if (options.status && options.status.length > 0) {
        query = query.in("status", options.status);
      } else if (!options.includeArchived) {
        // Por padrão, excluir atividades arquivadas
        query = query.neq("status", "archived");
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Buscar assignees separadamente para cada atividade
      const activitiesWithAssignees = await Promise.all(
        (data || []).map(async (activity) => {
          const { data: assignees } = await supabase
            .from('activity_assignees')
            .select(`
              user_id,
              profiles (
                full_name,
                avatar_url
              )
            `)
            .eq('activity_id', activity.id);
          
          return {
            ...activity,
            activity_assignees: assignees || []
          };
        })
      );

      // Conversão usando unknown primeiro
      setActivities((activitiesWithAssignees as unknown as Activity[]) || []);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
      toast({
        title: "Erro ao carregar atividades",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    profile?.sector_id,
    profile?.role,
    profile?.subsector_id,
    profile?.id,
    options,
    toast,
  ]);

  const updateActivityStatus = useCallback(
    async (activityId: string, status: ActivityStatus) => {
      try {
        const updateData: Partial<ActivityRow> & { status: ActivityStatus } = {
          status,
        };

        if (status === "completed") {
          updateData.completed_at = new Date().toISOString();
        } else {
          updateData.completed_at = null;
        }

        const { data, error } = await supabase
          .from("activities")
          .update(updateData)
          .eq("id", activityId)
          .select();

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          throw new Error(
            "Nenhuma linha foi atualizada. Verifique se você tem permissão para editar esta atividade."
          );
        }

        // Update local state
        setActivities((prev) => {
          const updatedActivities = prev.map((activity) =>
            activity.id === activityId
              ? { ...activity, ...updateData }
              : activity
          );

          // Se a atividade foi arquivada e não estamos incluindo arquivadas, remover da lista
          if (status === "archived" && !options.includeArchived) {
            return updatedActivities.filter(
              (activity) => activity.id !== activityId
            );
          }

          return updatedActivities;
        });

        toast({
          title: "Atividade atualizada",
          description: `Status alterado para ${getStatusLabel(status)}.`,
        });
      } catch (err: unknown) {
        const error = err as Error;
        toast({
          title: "Erro ao atualizar atividade",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    [toast, options.includeArchived]
  );

  const archiveActivity = useCallback(
    async (activityId: string) => {
      return updateActivityStatus(activityId, "archived");
    },
    [updateActivityStatus]
  );

  const deleteActivity = useCallback(
    async (activityId: string) => {
      try {
        const { error } = await supabase
          .from("activities")
          .delete()
          .eq("id", activityId);

        if (error) throw error;

        // Update local state immediately after success
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

  // Set up real-time subscription - Otimizado para melhor performance
  useEffect(() => {
    if (!profile?.sector_id) return;

    // Não usar subscription para atividades arquivadas para evitar refetch
    if (options.status?.includes("archived" as ActivityStatus)) {
      return;
    }

    let mounted = true;
    let activitiesChannel: ReturnType<typeof supabase.channel> | null = null;
    let subtasksChannel: ReturnType<typeof supabase.channel> | null = null;
    let debounceTimeout: NodeJS.Timeout;

    const setupSubscription = () => {
      // Subscription para mudanças nas activities
      const aChannel = supabase
        .channel(`activities_changes_${profile.sector_id}_${Math.random()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "activities",
            filter: `sector_id=eq.${profile.sector_id}`,
          },
          (payload) => {
            if (mounted) {
              console.log(
                "Activities real-time event:",
                payload.eventType,
                payload
              );

              clearTimeout(debounceTimeout);
              debounceTimeout = setTimeout(() => {
                if (mounted) {
                  fetchActivities();
                }
              }, 500); // Reduzir debounce para 0.5 segundos
            }
          }
        )
        .subscribe((status) => {
          if (mounted) {
            console.log("Activities subscription status:", status);
          }
        });

      // Subscription para mudanças nas subtasks
      const sChannel = supabase
        .channel(`subtasks_changes_${profile.sector_id}_${Math.random()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "subtasks",
          },
          (payload) => {
            if (mounted) {
              console.log(
                "Subtasks real-time event:",
                payload.eventType,
                payload
              );

              clearTimeout(debounceTimeout);
              debounceTimeout = setTimeout(() => {
                if (mounted) {
                  fetchActivities();
                }
              }, 500); // Reduzir debounce para 0.5 segundos
            }
          }
        )
        .subscribe((status) => {
          if (mounted) {
            console.log("Subtasks subscription status:", status);
          }
        });

      return { aChannel, sChannel };
    };

    // Delay na criação da subscription para evitar múltiplas simultâneas
    const subscriptionTimeout = setTimeout(() => {
      if (mounted) {
        const channels = setupSubscription();
        activitiesChannel = channels.aChannel;
        subtasksChannel = channels.sChannel;
      }
    }, 1000);

    return () => {
      mounted = false;
      clearTimeout(debounceTimeout);
      clearTimeout(subscriptionTimeout);
      if (activitiesChannel) supabase.removeChannel(activitiesChannel);
      if (subtasksChannel) supabase.removeChannel(subtasksChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.sector_id, options.status]); // fetchActivities é estável

  // Initial fetch
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
    updateActivityStatus,
    archiveActivity,
    deleteActivity,
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
