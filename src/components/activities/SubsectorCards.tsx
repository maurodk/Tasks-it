import React, { useEffect, useState, useMemo, useRef } from "react";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { DroppableSubsectorCard } from "@/components/activities/DroppableSubsectorCard";
import { Activity } from "@/hooks/useActivities";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuthFinal";
import { useActivityOperations } from "@/hooks/useActivityOperations";
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
  MeasuringStrategy,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

interface Subsector {
  id: string;
  name: string;
}

type SortOrder = "alphabetical" | "creation" | null;

interface SubsectorCardsProps {
  activities: Activity[];
  onAddActivity: (subsectorId: string, subsectorName: string) => void;
  onEditActivity: (activity: Activity) => void;
  hideEmpty?: boolean;
}

export const SubsectorCards: React.FC<SubsectorCardsProps> = ({
  activities,
  onAddActivity,
  onEditActivity,
  hideEmpty = false,
}) => {
  const [subsectors, setSubsectors] = useState<Subsector[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { profile } = useAuth();
  const { updateActivity } = useActivityOperations();

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
    const fetchSubsectors = async () => {
      if (!profile?.sector_id) return;
      try {
        if (profile.role === "manager") {
          // Gestores veem todos os subsetores do setor
          const { data, error } = await supabase
            .from("subsectors")
            .select("id, name")
            .eq("sector_id", profile.sector_id)
            .order("name");

          if (error) throw error;
          setSubsectors(data || []);
        } else if (profile.role === "collaborator") {
          // Colaboradores veem apenas seu subsetor principal
          if (profile.subsector_id) {
            const { data: primarySubsector, error: primaryError } =
              await supabase
                .from("subsectors")
                .select("id, name")
                .eq("id", profile.subsector_id)
                .single();

            if (!primaryError && primarySubsector) {
              setSubsectors([primarySubsector]);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao buscar subsetores:", error);
        setSubsectors([]);
      }
    };

    fetchSubsectors();
  }, [profile?.sector_id, profile?.role, profile?.subsector_id, profile?.id]);

  // Função para mover atividade entre subsetores
  const moveActivity = async (activityId: string, newSubsectorId: string) => {
    try {
      await updateActivity({ id: activityId, subsector_id: newSubsectorId });
    } catch (error) {
      console.error("Erro ao mover atividade:", error);
    }
  };

  const sortedActivities = useMemo(() => {
    const sorted = [...activities];
    if (sortOrder === "alphabetical") {
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sortOrder === "creation") {
      return sorted.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
    // Manual order (when no filter is selected)
    if (sortOrder === null) {
      if (manualOrder.length === 0 || manualOrder.length !== sorted.length) {
        // Only update manual order if it's empty or size mismatch, but don't trigger re-render
        const newOrder = sorted.map((a) => a.id);
        if (JSON.stringify(newOrder) !== JSON.stringify(manualOrder)) {
          setTimeout(() => setManualOrder(newOrder), 0);
        }
      }
      // Use manual order if available, otherwise use default order
      return manualOrder.length === sorted.length
        ? (manualOrder
            .map((id) => sorted.find((a) => a.id === id))
            .filter(Boolean) as Activity[])
        : sorted;
    }
    return sorted;
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

    // Move between subsectors
    if (overId.startsWith("subsector-")) {
      const newSubsectorId = overId.replace("subsector-", "");
      const activity = activities.find((a) => a.id === activeId);
      if (activity && activity.subsector_id !== newSubsectorId) {
        await moveActivity(activeId, newSubsectorId);
        // Force refresh
        window.dispatchEvent(new CustomEvent("activities-updated"));
      }
      return;
    }

    // Reorder within same subsector (manual mode only)
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

  const activeActivity = activeId
    ? activities.find((a) => a.id === activeId)
    : null;

  // Ref para medir o tamanho do cartão
  // We no longer measure the overlay size or apply manual transforms. The
  // DragOverlay is positioned by dnd-kit; to center the overlay at the
  // pointer we apply a nested transform on the inner element (translate(-50%,-50%)).

  return (
    <>
      {/* Sort Controls */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={sortOrder === "alphabetical" ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setSortOrder(sortOrder === "alphabetical" ? null : "alphabetical")
          }
          className="h-8 w-8 p-0"
          title="Ordem alfabética"
        >
          <SortAsc className="h-4 w-4" />
        </Button>
        <Button
          variant={sortOrder === "creation" ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setSortOrder(sortOrder === "creation" ? null : "creation")
          }
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
            strategy: MeasuringStrategy.Always,
          },
        }}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {subsectors.map((subsector) => {
            const subsectorActivities = sortedActivities.filter(
              (a) => a.subsector_id === subsector.id
            );

            if (hideEmpty && subsectorActivities.length === 0) {
              return null;
            }

            return (
              <DroppableSubsectorCard
                key={subsector.id}
                subsector={subsector}
                activities={subsectorActivities}
                onAddActivity={onAddActivity}
                onEditActivity={onEditActivity}
              />
            );
          })}
        </div>

        <DragOverlay dropAnimation={null} adjustScale={false}>
          {activeActivity ? (
            <div
              className="bg-white dark:bg-[#161616] rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 opacity-90 w-[280px] pointer-events-none"
              style={{ transform: "translate(-50%, -50%)" }}
            >
              <ActivityCard activity={activeActivity} isOverlay={true} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};
