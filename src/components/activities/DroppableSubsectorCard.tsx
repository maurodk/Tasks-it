import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableActivityCard } from "./DraggableActivityCard";
import { Activity } from "@/hooks/useActivities";
import { Plus } from "lucide-react";

interface Subsector {
  id: string;
  name: string;
}

interface DroppableSubsectorCardProps {
  subsector: Subsector;
  activities: Activity[];
  onAddActivity: (subsectorId: string, subsectorName: string) => void;
  onEditActivity: (activity: Activity) => void;
}

export const DroppableSubsectorCard: React.FC<DroppableSubsectorCardProps> = ({
  subsector,
  activities,
  onAddActivity,
  onEditActivity,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `subsector-${subsector.id}`,
    data: {
      // <-- ADICIONE ESTE OBJETO DE DADOS
      type: "subsector-droppable",
    },
  });

  return (
    <div className="relative">
      {/* Drop zone overlay */}
      <div
        ref={setNodeRef}
        className={`absolute inset-0 z-10 rounded-xl transition-all ${
          isOver
            ? "bg-blue-100/50 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-500"
            : "pointer-events-none"
        }`}
      />

      <div className="bg-gray-100 dark:bg-[#1f1f1f] rounded-xl p-3 min-h-[120px] border border-gray-200 dark:border-gray-700 flex flex-col relative w-80 flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
            {subsector.name}
          </h3>
          <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded-full">
            {activities.length}
          </span>
        </div>

        {/* Body */}
        <SortableContext
          items={activities.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex-1 flex flex-col gap-2 max-h-[65vh] lg:max-h-[70vh] overflow-y-auto pr-1">
            {activities.length === 0 ? (
              <button
                className="mt-1 p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-150 flex items-center gap-2 text-sm"
                onClick={() => onAddActivity(subsector.id, subsector.name)}
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar um cartão</span>
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                {activities.map((activity) => (
                  <DraggableActivityCard
                    key={activity.id}
                    activity={activity}
                    onEdit={onEditActivity}
                  />
                ))}

                <button
                  className="mt-1 p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-150 flex items-center gap-2 text-sm"
                  onClick={() => onAddActivity(subsector.id, subsector.name)}
                >
                  <Plus className="h-4 w-4" />
                  <span>Adicionar um cartão</span>
                </button>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};
