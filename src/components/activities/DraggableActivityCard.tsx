import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ActivityCard } from "./ActivityCard";
import { Activity } from "@/hooks/useActivities";

interface DraggableActivityCardProps {
  activity: Activity;
  onEdit: (activity: Activity) => void;
}

export function DraggableActivityCard({
  activity,
  onEdit,
}: DraggableActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white dark:bg-[#161616] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500 cursor-grab active:cursor-grabbing transition-all duration-150 hover:shadow-md overflow-hidden flex-shrink-0"
    >
      <ActivityCard activity={activity} onClick={() => onEdit(activity)} />
    </div>
  );
}
