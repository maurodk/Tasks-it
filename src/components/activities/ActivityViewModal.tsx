import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useGlobalEscClose } from "@/hooks/useGlobalEscClose";
import { X, Calendar, User, Flag, Clock, CheckSquare } from "lucide-react";
import { Activity } from "@/hooks/useActivities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Tipo compatível com LocalActivity do ActiveCollaboratorsManager
type LocalActivity = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  due_date?: string | null;
  created_at: string;
  completed_at?: string | null;
  list_id?: string | null;
  subsectors?: { name?: string | null } | null;
  subtasks?: Array<{ id: string; title: string; is_completed: boolean; checklist_group?: string }>;
  profiles?: { full_name: string } | null;
};

interface ActivityViewModalProps {
  activity: Activity | LocalActivity | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityViewModal: React.FC<ActivityViewModalProps> = ({
  activity,
  isOpen,
  onClose,
}) => {
  useGlobalEscClose(isOpen, onClose, 160);

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

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

  if (!isOpen || !activity) return null;

  const checklistGroups = activity.subtasks?.reduce(
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

  return createPortal(
    <div className="fixed inset-0 z-[160] grid place-items-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-[95vw] max-w-2xl max-h-[90vh] bg-background border rounded-2xl shadow-2xl overflow-hidden z-[160]">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur border-b px-6 py-4 flex items-center justify-between z-[170]">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {activity.title}
            {((activity as unknown as { is_private?: boolean }).is_private ?? false) && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                Privada
              </span>
            )}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div
          className="overflow-y-scroll max-h-[calc(90vh-140px)] z-[165]"
          style={{ scrollbarGutter: "stable" }}
        >
          <div className="p-6 space-y-6">
            {/* Status e Prioridade */}
            <div className="flex flex-wrap gap-2">
              <Badge className={`border ${getStatusColor(activity.status)}`}>
                {getStatusLabel(activity.status)}
              </Badge>
              <Badge className={`border ${getPriorityColor(activity.priority)}`}>
                {getPriorityLabel(activity.priority)}
              </Badge>
            </div>

            {/* Descrição */}
            {activity.description && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">Descrição</h3>
                <p className="text-sm leading-relaxed">{activity.description}</p>
              </div>
            )}

            {/* Data de vencimento */}
            {activity.due_date && (() => {
              try {
                const date = new Date(activity.due_date + "T00:00:00");
                if (isNaN(date.getTime())) return null;
                return (
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-muted-foreground">Data de Vencimento</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      {format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </div>
                  </div>
                );
              } catch (error) {
                console.warn("Invalid due_date:", activity.due_date, error);
                return null;
              }
            })()}

            {/* Responsável */}
            {activity.profiles && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">Responsável</h3>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  {activity.profiles.full_name}
                </div>
              </div>
            )}

            {/* Checklists */}
            {Object.keys(checklistGroups).length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground">Checklists</h3>
                {Object.entries(checklistGroups).map(([groupName, subtasks]) => {
                  const groupCompleted = subtasks.filter((s) => s.is_completed).length;
                  const groupTotal = subtasks.length;
                  const percentage = (groupCompleted / groupTotal) * 100;
                  const isComplete = groupCompleted === groupTotal;

                  return (
                    <div
                      key={groupName}
                      className="bg-gray-50 dark:bg-[#0f0f0f] dark:border dark:border-gray-800 rounded-md p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <CheckSquare
                          className={`h-4 w-4 ${
                            isComplete ? "text-green-600" : "text-gray-500"
                          }`}
                        />
                        <span className="font-medium text-gray-700 dark:text-gray-300 flex-1">
                          {groupName}
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            isComplete
                              ? "text-green-600"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {groupCompleted}/{groupTotal}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isComplete ? "bg-green-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      {/* Lista de itens */}
                      <div className="space-y-2">
                        {subtasks.map((subtask) => (
                          <div
                            key={subtask.id}
                            className="flex items-center gap-3 text-sm"
                          >
                            <div
                              className={`w-4 h-4 rounded-full flex-shrink-0 ${
                                subtask.is_completed
                                  ? "bg-green-500"
                                  : "bg-gray-300 dark:bg-gray-600"
                              }`}
                            />
                            <span
                              className={`${
                                subtask.is_completed
                                  ? "line-through text-gray-500 dark:text-gray-500"
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {subtask.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Data de criação */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Criada em {(() => {
                  try {
                    return format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                  } catch (error) {
                    console.warn("Invalid created_at:", activity.created_at, error);
                    return "Data inválida";
                  }
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t px-6 py-4 flex justify-end z-[170]">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};