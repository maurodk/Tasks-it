import React, { useState, useEffect } from "react";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { Activity } from "@/hooks/useActivities";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Plus } from "lucide-react";

interface Subsector {
  id: string;
  name: string;
}

interface KanbanBoardProps {
  activities: Activity[];
  onAddActivity: (subsectorId: string, subsectorName: string) => void;
  onEditActivity: (activity: Activity) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  activities,
  onAddActivity,
  onEditActivity,
}) => {
  const [subsectors, setSubsectors] = useState<Subsector[]>([]);
  const { profile } = useAuth();

  useEffect(() => {
    const fetchSubsectors = async () => {
      if (!profile?.sector_id) return;

      try {
        const { data, error } = await supabase
          .from("subsectors")
          .select("id, name")
          .eq("sector_id", profile.sector_id)
          .order("name");

        if (error) throw error;
        setSubsectors(data || []);
      } catch (error) {
        console.error("Erro ao buscar subsetores:", error);
      }
    };

    fetchSubsectors();
  }, [profile?.sector_id]);

  return (
    <div className="flex gap-4 overflow-x-auto h-full pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 dark:hover:scrollbar-thumb-gray-500">
      {subsectors.map((subsector) => {
        const subsectorActivities = activities.filter(
          (a) => a.subsector_id === subsector.id
        );

        return (
          <div
            key={subsector.id}
            className="min-w-[300px] w-[300px] bg-gray-100 dark:bg-gray-800 rounded-xl p-3 h-fit max-h-[calc(100vh-200px)] flex flex-col border border-gray-200 dark:border-gray-700"
          >
            {/* Header da coluna */}
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                {subsector.name}
              </h3>
              <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                {subsectorActivities.length}
              </span>
            </div>

            {/* Lista de cartões */}
            <div className="flex flex-col gap-2 overflow-y-auto flex-1 px-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 dark:hover:scrollbar-thumb-gray-500">
              {subsectorActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white dark:bg-[#161616] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all duration-150 hover:shadow-md"
                  onClick={() => onEditActivity(activity)}
                >
                  <ActivityCard activity={activity} />
                </div>
              ))}

              {/* Botão adicionar cartão */}
              <button
                className="mt-2 p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-150 flex items-center gap-2 text-sm group"
                onClick={() => onAddActivity(subsector.id, subsector.name)}
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar um cartão</span>
              </button>
            </div>
          </div>
        );
      })}

      {/* Espaçamento final para scroll */}
      <div className="min-w-[20px]"></div>
    </div>
  );
};
