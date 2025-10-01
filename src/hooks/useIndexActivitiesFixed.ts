import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Activity } from "@/hooks/useOptimizedActivities";

export function useIndexActivitiesFixed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchActivities = useCallback(async () => {
    if (!profile?.sector_id) {
      console.log("❌ Setor não definido no perfil");
      setActivities([]);
      setLoading(false);
      return;
    }

    console.log("🔄 Carregando atividades para setor:", profile.sector_id);
    setLoading(true);
    
    try {
      // Query simplificada - sem filtros complexos
      const { data, error } = await supabase
        .from("activities")
        .select(`
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
        `)
        .eq("sector_id", profile.sector_id)
        .neq("status", "archived")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Erro na consulta:", error);
        throw error;
      }

      console.log(`✅ ${data?.length || 0} atividades carregadas`);
      setActivities((data as unknown as Activity[]) || []);
    } catch (error) {
      console.error("❌ Erro ao carregar atividades:", error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.sector_id]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return { activities, loading, refetch: fetchActivities };
}