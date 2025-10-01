import React, { useEffect, useState, useMemo } from "react";
import { Activity } from "@/hooks/useActivities";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { DroppableCollaboratorCard } from "@/components/activities/DroppableCollaboratorCard";
import { useAuth } from "@/hooks/useAuth";
import { useActivityOperations } from "@/hooks/useActivityOperations";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, SortAsc, Clock } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

interface Collaborator {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

type SortOrder = 'alphabetical' | 'creation' | null;

interface CollaboratorCardsProps {
  activities: Activity[];
  onEditActivity: (activity: Activity) => void;
  subsectorId: string;
  onAddActivity: (userId: string, userName: string) => void;
}

export const CollaboratorCards: React.FC<CollaboratorCardsProps> = ({
  activities,
  onEditActivity,
  subsectorId,
  onAddActivity,
}) => {
  const { profile } = useAuth();
  const { updateActivity } = useActivityOperations();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('creation');
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchCollaborators = async () => {
      if (!profile?.sector_id || !subsectorId) return;
      try {
        // Buscar colaboradores que têm este subsetor (nova tabela)
        const { data: profileSubsectors, error: psError } = await supabase
          .from("profile_subsectors")
          .select(`
            profile_id,
            profiles (
              id,
              full_name,
              avatar_url,
              sector_id
            )
          `)
          .eq("subsector_id", subsectorId);

        if (psError) throw psError;

        // Filtrar por setor e extrair profiles
        const collaboratorsFromNew = profileSubsectors
          ?.filter(ps => ps.profiles?.sector_id === profile.sector_id)
          .map(ps => ps.profiles)
          .filter(Boolean) || [];

        // Buscar também colaboradores com subsector_id antigo (compatibilidade)
        const { data: oldCollaborators, error: oldError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("sector_id", profile.sector_id)
          .eq("subsector_id", subsectorId);

        if (oldError) throw oldError;

        // Combinar e remover duplicatas
        const allCollaborators = [...collaboratorsFromNew, ...(oldCollaborators || [])];
        const uniqueCollaborators = allCollaborators.filter((colab, index, arr) => 
          arr.findIndex(c => c.id === colab.id) === index
        );

        setCollaborators(uniqueCollaborators.sort((a, b) => a.full_name.localeCompare(b.full_name)));
      } catch (e) {
        console.error("Erro ao buscar colaboradores:", e);
        setCollaborators([]);
      }
    };
    fetchCollaborators();
  }, [profile?.sector_id, subsectorId]);

  // Função para mover atividade entre colaboradores
  const moveActivity = async (activityId: string, newUserId: string) => {
    try {
      await updateActivity({ id: activityId, user_id: newUserId });
    } catch (error) {
      console.error('Erro ao mover atividade:', error);
    }
  };

  const sortedActivities = useMemo(() => {
    const sorted = [...activities];
    if (sortOrder === 'alphabetical') {
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sortOrder === 'creation') {
      return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    // Manual order (when no filter is selected)
    if (manualOrder.length === 0) {
      setManualOrder(sorted.map(a => a.id));
      return sorted;
    }
    return manualOrder.map(id => sorted.find(a => a.id === id)).filter(Boolean) as Activity[];
  }, [activities, sortOrder, manualOrder]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Only visual feedback, no actual moving
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Move between collaborators
    if (overId.startsWith('collaborator-')) {
      const newUserId = overId.replace('collaborator-', '');
      const activity = activities.find(a => a.id === activeId);
      if (activity && activity.user_id !== newUserId) {
        await moveActivity(activeId, newUserId);
        // Force refresh
        window.dispatchEvent(new CustomEvent('activities-updated'));
      }
      return;
    }

    // Reorder within same collaborator (manual mode only)
    if (sortOrder === null) {
      const oldIndex = manualOrder.indexOf(activeId);
      const newIndex = manualOrder.indexOf(overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = [...manualOrder];
        newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, activeId);
        setManualOrder(newOrder);
      }
    }
  };

  const activeActivity = activeId ? activities.find(a => a.id === activeId) : null;

  return (
    <>
      {/* Sort Controls */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={sortOrder === 'alphabetical' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortOrder(sortOrder === 'alphabetical' ? null : 'alphabetical')}
          className="h-8 w-8 p-0"
          title="Ordem alfabética"
        >
          <SortAsc className="h-4 w-4" />
        </Button>
        <Button
          variant={sortOrder === 'creation' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortOrder(sortOrder === 'creation' ? null : 'creation')}
          className="h-8 w-8 p-0"
          title="Ordem de criação"
        >
          <Clock className="h-4 w-4" />
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        measuring={{
          droppable: {
            strategy: 'always',
          },
        }}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {collaborators.map((colab) => {
            const colabActivities = sortedActivities.filter(
              (a) => a.user_id === colab.id
            );
            
            return (
              <DroppableCollaboratorCard
                key={colab.id}
                collaborator={colab}
                activities={colabActivities}
                onAddActivity={onAddActivity}
                onEditActivity={onEditActivity}
              />
            );
          })}
        </div>

        <DragOverlay 
          dropAnimation={null}
          adjustScale={false}
          style={{
            transformOrigin: '0 0',
          }}
          modifyTranslate={({ transform }) => {
            return {
              x: transform.x - 140, // metade da largura do card (280px / 2)
              y: transform.y - 50,   // ajuste vertical para centralizar
              scaleX: 1,
              scaleY: 1,
            };
          }}
        >
          {activeActivity ? (
            <div className="bg-white dark:bg-[#161616] rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 opacity-90 w-[280px] rotate-2 pointer-events-none">
              <ActivityCard activity={activeActivity} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};
