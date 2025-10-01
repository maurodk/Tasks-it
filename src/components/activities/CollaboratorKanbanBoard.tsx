import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { Activity } from "@/hooks/useActivities";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Collaborator {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface CollaboratorKanbanBoardProps {
  activities: Activity[];
  subsectorId: string;
  onAddActivity: (userId: string, userName: string) => void;
  onEditActivity: (activity: Activity) => void;
}

export const CollaboratorKanbanBoard: React.FC<
  CollaboratorKanbanBoardProps
> = ({ activities, subsectorId, onAddActivity, onEditActivity }) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const { profile } = useAuth();

  useEffect(() => {
    const fetchCollaborators = async () => {
      if (!profile?.sector_id) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("sector_id", profile.sector_id)
          .eq("subsector_id", subsectorId)
          .order("full_name");

        if (error) throw error;
        setCollaborators(data || []);
      } catch (error) {
        console.error("Erro ao buscar colaboradores:", error);
      }
    };

    fetchCollaborators();
  }, [profile?.sector_id, subsectorId]);

  // Adicionar um "grupo" para atividades não atribuídas
  const allGroups = [
    { id: "unassigned", full_name: "Não Atribuídas", avatar_url: null },
    ...collaborators,
  ];

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 dark:hover:scrollbar-thumb-gray-500">
      {allGroups.map((collaborator) => {
        const collaboratorActivities =
          collaborator.id === "unassigned"
            ? activities.filter(
                (a) =>
                  !a.user_id || !collaborators.find((c) => c.id === a.user_id)
              )
            : activities.filter((a) => a.user_id === collaborator.id);

        return (
          <div
            key={collaborator.id}
            className="min-w-[320px] w-80 bg-gray-100 dark:bg-[#1f1f1f] rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col"
          >
            <CardHeader className="pb-3 px-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={collaborator.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {collaborator.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {collaborator.full_name}
                  </CardTitle>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded-full">
                  {collaboratorActivities.length}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-3 px-4">
              {collaboratorActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="cursor-pointer bg-white dark:bg-[#161616] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-150 hover:shadow-md"
                >
                  <ActivityCard
                    activity={activity}
                    onClick={() => onEditActivity(activity)}
                  />
                </div>
              ))}

              {collaboratorActivities.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
                  Nenhuma atividade
                </div>
              )}
            </CardContent>

            <div className="p-4 pt-0">
              <button
                className="w-full py-2.5 px-4 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-150 flex items-center justify-center gap-2 text-sm border border-gray-200 dark:border-gray-700"
                onClick={() =>
                  onAddActivity(collaborator.id, collaborator.full_name)
                }
              >
                <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                Adicionar cartão
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
