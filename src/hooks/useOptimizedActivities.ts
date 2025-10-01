import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/types/supabase";

// Tipos reutilizados do useActivities
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

export type Subtask = SubtaskRow;
export type Activity = ActivityRow & {
  profiles?: ProfileData | null;
  subsectors?: SubsectorData | null;
  subtasks?: Subtask[];
};

type ActivityStatus = Database["public"]["Enums"]["activity_status"];

// Singleton para gerenciar o estado global das atividades
class ActivitiesManager {
  private activities: Activity[] = [];
  private loading = true;
  private error: string | null = null;
  private subscribers: Set<() => void> = new Set();
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private currentSectorId: string | null = null;
  private debounceTimeout: NodeJS.Timeout | null = null;

  subscribe(callback: () => void) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify() {
    this.subscribers.forEach((callback) => callback());
  }

  getState() {
    return {
      activities: this.activities,
      loading: this.loading,
      error: this.error,
    };
  }

  async fetchActivities(
    sectorId: string,
    userRole: string,
    userSubsectorId?: string
  ) {
    if (this.currentSectorId !== sectorId) {
      this.setupRealTime(sectorId);
      this.currentSectorId = sectorId;
    }

    this.loading = true;
    this.notify();

    try {
      let query = supabase
        .from("activities")
        .select(
          `
          *,
          profiles:user_id (
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
            order_index,
            created_at,
            updated_at
          )
        `
        )
        .eq("sector_id", sectorId)
        .neq("status", "archived") // Excluir arquivadas por padrão
        .order("created_at", { ascending: false });

      // Aplicar filtro de colaborador se necessário
      if (userRole === "collaborator" && userSubsectorId) {
        query = query.eq("subsector_id", userSubsectorId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      this.activities = (data as unknown as Activity[]) || [];
      this.error = null;
    } catch (err: unknown) {
      const error = err as Error;
      this.error = error.message;
      this.activities = [];
    } finally {
      this.loading = false;
      this.notify();
    }
  }

  private setupRealTime(sectorId: string) {
    // Limpar subscription anterior
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }

    this.channel = supabase
      .channel(`activities_global_${sectorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activities",
          filter: `sector_id=eq.${sectorId}`,
        },
        (payload) => {
          console.log("Real-time event:", payload.eventType);

          // Debounce para evitar múltiplas chamadas
          if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
          }

          this.debounceTimeout = setTimeout(() => {
            this.refetchActivities();
          }, 1000);
        }
      )
      .subscribe();
  }

  private async refetchActivities() {
    if (!this.currentSectorId) return;

    // Re-fetch sem mudar o loading state para evitar flicker
    try {
      const query = supabase
        .from("activities")
        .select(
          `
          *,
          profiles:user_id (
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
            order_index,
            created_at,
            updated_at
          )
        `
        )
        .eq("sector_id", this.currentSectorId)
        .neq("status", "archived")
        .order("created_at", { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      this.activities = (data as unknown as Activity[]) || [];
      this.notify();
    } catch (err) {
      console.error("Erro no refetch:", err);
    }
  }

  async updateActivityStatus(activityId: string, status: ActivityStatus) {
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

      if (error) throw error;

      // Atualizar estado local imediatamente
      this.activities = this.activities.map((activity) =>
        activity.id === activityId ? { ...activity, ...updateData } : activity
      );

      // Se foi arquivada, remover da lista
      if (status === "archived") {
        this.activities = this.activities.filter(
          (activity) => activity.id !== activityId
        );
      }

      this.notify();
      return true;
    } catch (error) {
      console.error("Erro ao atualizar atividade:", error);
      return false;
    }
  }

  destroy() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.subscribers.clear();
  }
}

const activitiesManager = new ActivitiesManager();

export function useOptimizedActivities() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState(activitiesManager.getState());

  useEffect(() => {
    const unsubscribe = activitiesManager.subscribe(() => {
      setState(activitiesManager.getState());
    });

    return unsubscribe;
  }, []);

  // Global refetch on tab focus/visibility
  useEffect(() => {
    const handler = () => {
      if (profile?.sector_id) {
        activitiesManager.fetchActivities(
          profile.sector_id,
          profile.role || "collaborator",
          profile.subsector_id || undefined
        );
      }
    };
    window.addEventListener("app:refetch", handler as EventListener);
    return () =>
      window.removeEventListener("app:refetch", handler as EventListener);
  }, [profile?.sector_id, profile?.role, profile?.subsector_id]);

  useEffect(() => {
    if (profile?.sector_id) {
      activitiesManager.fetchActivities(
        profile.sector_id,
        profile.role || "collaborator",
        profile.subsector_id || undefined
      );
    }
  }, [profile?.sector_id, profile?.role, profile?.subsector_id]);

  const updateActivityStatus = useCallback(
    async (activityId: string, status: ActivityStatus) => {
      const success = await activitiesManager.updateActivityStatus(
        activityId,
        status
      );
      if (success) {
        toast({
          title: "Atividade atualizada",
          description: `Status alterado para ${getStatusLabel(status)}.`,
        });
      } else {
        toast({
          title: "Erro ao atualizar atividade",
          description: "Não foi possível atualizar o status da atividade.",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const archiveActivity = useCallback(
    async (activityId: string) => {
      return updateActivityStatus(activityId, "archived");
    },
    [updateActivityStatus]
  );

  const refetch = useCallback(() => {
    if (profile?.sector_id) {
      activitiesManager.fetchActivities(
        profile.sector_id,
        profile.role || "collaborator",
        profile.subsector_id || undefined
      );
    }
  }, [profile?.sector_id, profile?.role, profile?.subsector_id]);

  return {
    activities: state.activities,
    loading: state.loading,
    error: state.error,
    refetch,
    updateActivityStatus,
    archiveActivity,
    deleteActivity: archiveActivity, // Por simplicidade, usar archive
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

// Cleanup no unmount da aplicação
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    activitiesManager.destroy();
  });
}
