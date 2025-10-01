import { Activity } from "@/hooks/useActivities";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  User,
  CheckSquare,
  Tag,
  AlertTriangle,
} from "lucide-react";

interface ActivityCardProps {
  activity: Activity;
  onClick?: () => void;
  isOverlay?: boolean;
}

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700";
      case "in_progress":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700";
      case "archived":
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600";
      default:
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700";
      case "medium":
        return "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700";
      case "low":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600";
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

  // Agrupar e ordenar subtasks por grupo de checklist
  const checklistGroups =
    activity.subtasks?.reduce(
      (groups: { [key: string]: typeof activity.subtasks }, subtask) => {
        const groupName = subtask.checklist_group || "Checklist";
        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(subtask);
        return groups;
      },
      {}
    ) || {};

  // Sort tasks within each group and ensure consistent group order
  Object.keys(checklistGroups).forEach((groupName) => {
    checklistGroups[groupName].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );
  });

  // Get sorted group names (newest first)
  const sortedGroupNames = Object.keys(checklistGroups).sort((a, b) =>
    b.localeCompare(a)
  );

  const totalSubtasks = activity.subtasks?.length || 0;
  const completedSubtasks =
    activity.subtasks?.filter((t) => t.is_completed).length || 0;
  activity.subtasks?.filter((s) => s.is_completed).length || 0;

  return (
    <div
      className={`p-3 cursor-pointer group transition-all duration-200 ${
        activity.priority === "high"
          ? "bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500 shadow-md hover:shadow-lg"
          : ""
      } h-full flex flex-col`}
      onClick={onClick}
    >
      {/* Título + marcador de privacidade */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          {activity.priority === "high" && (
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          )}
          <h4
            className={`text-sm font-medium leading-5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
              activity.priority === "high"
                ? "text-red-800 dark:text-red-200 font-semibold"
                : "text-gray-800 dark:text-gray-200"
            }`}
          >
            {activity.title}
          </h4>
        </div>
        {((activity as unknown as { is_private?: boolean }).is_private ??
          false) && (
          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            Privada
          </span>
        )}
      </div>

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

      {/* Contador de Checklists */}
      {totalSubtasks > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
          <CheckSquare className="h-3 w-3" />
          <span>
            {completedSubtasks}/{totalSubtasks}
          </span>
        </div>
      )}

      {/* Data de vencimento */}
      {activity.due_date &&
        (() => {
          try {
            const date = new Date(activity.due_date + "T00:00:00");
            if (isNaN(date.getTime())) return null;
            return (
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
                <Calendar className="h-3 w-3 text-gray-700 dark:text-gray-400" />
                <span>{format(date, "dd/MM")}</span>
              </div>
            );
          } catch (error) {
            console.warn("Invalid date:", activity.due_date, error);
            return null;
          }
        })()}

      {/* Checklist Groups Preview */}
      {totalSubtasks > 0 && (
        <div className="space-y-2 mb-2 overflow-hidden">
          {sortedGroupNames.map((groupName) => {
            const subtasks = checklistGroups[groupName];
            const groupCompleted = subtasks.filter(
              (s) => s.is_completed
            ).length;
            const groupTotal = subtasks.length;
            const percentage = (groupCompleted / groupTotal) * 100;
            const isComplete = groupCompleted === groupTotal;

            return (
              <div
                key={groupName}
                className="bg-gray-50 dark:bg-[#0f0f0f] dark:border dark:border-gray-800 rounded-md p-2"
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckSquare
                    className={`h-3 w-3 ${
                      isComplete ? "text-green-600" : "text-gray-500"
                    }`}
                  />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-1">
                    {groupName}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      isComplete
                        ? "text-green-600"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {groupCompleted}/{groupTotal}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isComplete ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Preview dos primeiros itens */}
                <div className="mt-1 space-y-0.5">
                  {subtasks.slice(0, 2).map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          subtask.is_completed
                            ? "bg-green-500"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      />
                      <span
                        className={`truncate ${
                          subtask.is_completed
                            ? "line-through text-gray-500 dark:text-gray-500"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                  {subtasks.length > 2 && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 pl-3">
                      +{subtasks.length - 2} itens
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Usuário responsável */}
      {activity.profiles && (
        <div className="mt-auto flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
          <User className="h-3 w-3 text-gray-700 dark:text-gray-400" />
          <span>{activity.profiles.full_name || "Usuário"}</span>
        </div>
      )}
    </div>
  );
}
