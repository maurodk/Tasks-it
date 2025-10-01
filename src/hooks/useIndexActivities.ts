import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Activity } from "@/hooks/useOptimizedActivities";

// Hook simplificado especificamente para a página Index (KPIs + Calendário)
export function useIndexActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchActivities = useCallback(async () => {
    if (!profile?.sector_id) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
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
            title,
            is_completed,
            checklist_group,
            order_index
          )
        `
        )
        .eq("sector_id", profile.sector_id)
        .neq("status", "archived")
        .order("created_at", { ascending: false });

      // Filtro para colaboradores
      if (profile.role === "collaborator" && profile.subsector_id) {
        // Para colaboradores: ver atividades do seu subsetor OU atividades criadas por você (inclui listas privadas)
        query = query.or(
          `subsector_id.eq.${profile.subsector_id},created_by.eq.${profile.id}`
        );
      } else if (profile.id) {
        // Gestores: excluir cartões de listas privadas de OUTROS usuários
        query = query.or(
          `list_id.is.null,and(list_id.not.is.null,created_by.eq.${profile.id})`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro na consulta de atividades:", error);
        throw error;
      }

      setActivities((data as unknown as Activity[]) || []);
    } catch (error) {
      console.error("Erro ao carregar atividades:", error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.sector_id, profile?.role, profile?.subsector_id, profile?.id]);
  useEffect(() => {
    fetchActivities();

    // Real-time subscription apenas para esta instância
    let channel;

    try {
      if (profile?.sector_id) {
        channel = supabase
          .channel(`index_activities_${profile.sector_id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "activities",
              filter: `sector_id=eq.${profile.sector_id}`,
            },
            () => {
              // Refetch após mudanças
              fetchActivities();
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "subtasks",
            },
            () => {
              // Refetch após mudanças nas subtasks também
              fetchActivities();
            }
          )
          .subscribe();
      }
    } catch (error) {
      console.error("Erro ao configurar canal em tempo real:", error);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchActivities, profile?.sector_id]);

  return { activities, loading, refetch: fetchActivities };
}
