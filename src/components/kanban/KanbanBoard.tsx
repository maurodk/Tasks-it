import React, { useState, useMemo } from "react";
import { useActivities } from "@/hooks/useActivities";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { ActivityCard } from "./ActivityCard";
import { QuickCreateModal } from "./QuickCreateModal";
import { ActivityDetailModal } from "./ActivityDetailModal";
import { CollapsibleCalendar } from "./CollapsibleCalendar";
import type { Activity } from "@/hooks/useActivities";

interface KanbanBoardProps {
  subsectorId?: string;
}

export function KanbanBoard({ subsectorId }: KanbanBoardProps) {
  const { profile } = useAuth();
  const { activities, loading, refetch } = useActivities({
    subsectorId,
    includeArchived: false,
  });

  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Agrupar atividades por usuário
  const activityColumns = useMemo(() => {
    const grouped = activities.reduce((acc, activity) => {
      const userId = activity.user_id;
      const userName = activity.profiles?.full_name || "Usuário Desconhecido";
      const userAvatar = activity.profiles?.avatar_url;

      if (!acc[userId]) {
        acc[userId] = {
          id: userId,
          name: userName,
          avatar: userAvatar,
          activities: [],
        };
      }

      acc[userId].activities.push(activity);
      return acc;
    }, {} as Record<string, { id: string; name: string; avatar?: string | null; activities: Activity[] }>);

    // Adicionar coluna do usuário atual se não tiver atividades
    if (profile && !grouped[profile.id]) {
      grouped[profile.id] = {
        id: profile.id,
        name: profile.full_name,
        avatar: profile.avatar_url,
        activities: [],
      };
    }

    return Object.values(grouped);
  }, [activities, profile]);

  const handleQuickCreate = (data: { title: string; description?: string }) => {
    // Implementar criação rápida
    setShowQuickCreate(false);
    refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09b230]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Dashboard</h1>

          {/* Botão do Calendário */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCalendar(!showCalendar)}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Calendário
            {showCalendar ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Botão de criar atividade */}
        <Button
          onClick={() => setShowQuickCreate(true)}
          className="bg-[#09b230] hover:bg-[#08a02c] flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Atividade
        </Button>
      </div>

      {/* Calendário Colapsível */}
      {showCalendar && (
        <CollapsibleCalendar
          activities={activities}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* Board Kanban */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max">
          {activityColumns.map((column) => (
            <div key={column.id} className="flex-shrink-0 w-80">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3">
                    {column.avatar ? (
                      <img
                        src={column.avatar}
                        alt={column.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#09b230] flex items-center justify-center text-white text-sm font-medium">
                        {column.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{column.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {column.activities.length} atividades
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                  {column.activities.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      onClick={() => setSelectedActivity(activity)}
                    />
                  ))}

                  {/* Botão para adicionar atividade na coluna */}
                  {(profile?.role === "manager" ||
                    column.id === profile?.id) && (
                    <Button
                      variant="ghost"
                      className="w-full h-20 border-2 border-dashed border-muted-foreground/20 hover:border-[#09b230] hover:bg-[#09b230]/5 flex items-center justify-center gap-2"
                      onClick={() => {
                        setSelectedUser(column.id);
                        setShowQuickCreate(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar atividade
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <QuickCreateModal
        open={showQuickCreate}
        onOpenChange={setShowQuickCreate}
        onSubmit={handleQuickCreate}
        assignedUserId={selectedUser}
        subsectorId={subsectorId}
      />

      <ActivityDetailModal
        activity={selectedActivity}
        open={!!selectedActivity}
        onOpenChange={(open) => !open && setSelectedActivity(null)}
        onSuccess={() => {
          setSelectedActivity(null);
          refetch();
        }}
      />
    </div>
  );
}
