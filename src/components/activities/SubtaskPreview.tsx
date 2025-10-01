import React from "react";
import { CheckSquare } from "lucide-react";
import { Subtask } from "@/hooks/useActivities";

interface SubtaskPreviewProps {
  subtasks: Subtask[];
  size?: "sm" | "md";
}

export const SubtaskPreview: React.FC<SubtaskPreviewProps> = ({
  subtasks,
  size = "sm",
}) => {
  if (!subtasks || subtasks.length === 0) {
    return null;
  }

  const completedCount = subtasks.filter((st) => st.is_completed).length;
  const totalCount = subtasks.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const barHeight = size === "sm" ? "h-1" : "h-2";

  return (
    <div className="flex items-center gap-2">
      <CheckSquare className={`${iconSize} text-[#09b230]`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`${textSize} text-muted-foreground font-medium`}>
            {completedCount}/{totalCount}
          </span>
          <div className={`flex-1 bg-secondary rounded-full ${barHeight}`}>
            <div
              className={`bg-[#09b230] ${barHeight} rounded-full transition-all duration-300`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <span className={`${textSize} text-muted-foreground`}>
            {progressPercentage}%
          </span>
        </div>
      </div>
    </div>
  );
};
