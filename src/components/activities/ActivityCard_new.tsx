import { Activity } from "@/hooks/useActivities";
import { format } from "date-fns";
import { Calendar, Clock, User, CheckSquare, Tag } from "lucide-react";

interface ActivityCardProps {
  activity: Activity;
  onClick?: () => void;
}

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "archived":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Concluída";
      case "in_progress":
        return "Em Andamento";
      case "pending":
        return "Pendente";
      case "archived":
        return "Arquivada";
      default:
        return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "Alta";
      case "medium":
        return "Média";
      case "low":
        return "Baixa";
      default:
        return priority;
    }
  };

  return (
    <div className="p-3 cursor-pointer group" onClick={onClick}>
      {/* Título */}
      <h4 className="text-sm font-medium text-[#172b4d] mb-2 leading-5 group-hover:text-[#026aa7] transition-colors">
        {activity.title}
      </h4>

      {/* Tags/Labels */}
      {(activity.priority || activity.status) && (
        <div className="flex flex-wrap gap-1 mb-2">
          {activity.priority && (
            <span
              className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(
                activity.priority
              )}`}
            >
              {getPriorityLabel(activity.priority)}
            </span>
          )}
          <span
            className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
              activity.status
            )}`}
          >
            {getStatusLabel(activity.status)}
          </span>
        </div>
      )}

      {/* Data de vencimento */}
      {activity.due_date && (
        <div className="flex items-center gap-1 text-xs text-[#5e6c84] mb-2">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(activity.due_date), "dd/MM")}</span>
        </div>
      )}

      {/* Checklist Progress */}
      {activity.subtasks && activity.subtasks.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-[#5e6c84] mb-2">
          <CheckSquare className="h-3 w-3" />
          <span className="font-medium">
            {activity.subtasks.filter((s) => s.is_completed).length}/
            {activity.subtasks.length}
          </span>
          <div className="flex-1 bg-[#ddd] rounded-full h-1">
            <div
              className="bg-[#026aa7] h-1 rounded-full transition-all duration-300"
              style={{
                width: `${
                  activity.subtasks.length > 0
                    ? (activity.subtasks.filter((s) => s.is_completed).length /
                        activity.subtasks.length) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Usuário responsável */}
      {activity.profiles && (
        <div className="flex items-center gap-1 text-xs text-[#5e6c84]">
          <User className="h-3 w-3" />
          <span>{activity.profiles.full_name || "Usuário"}</span>
        </div>
      )}
    </div>
  );
}
