import { Activity } from "@/hooks/useActivities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  User,
  FileText,
  Target,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SubtaskPreview } from "@/components/activities/SubtaskPreview";
import { useSubtasks } from "@/hooks/useSubtasks";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface ActivityDetailModalProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

export function ActivityDetailModal({
  activity,
  open,
  onOpenChange,
  onRefresh,
}: ActivityDetailModalProps) {
  const { updateSubtask } = useSubtasks();
  const { toast } = useToast();
  const [localSubtasks, setLocalSubtasks] = useState(activity?.subtasks || []);

  // Sincronizar estado local com a atividade
  useEffect(() => {
    if (activity?.subtasks) {
      setLocalSubtasks(activity.subtasks);
    }
  }, [activity?.subtasks]);

  if (!activity) return null;

  const handleToggleSubtask = async (
    subtaskId: string,
    currentStatus: boolean
  ) => {
    // Atualizar estado local imediatamente para feedback visual
    setLocalSubtasks((prev) =>
      prev.map((subtask) =>
        subtask.id === subtaskId
          ? { ...subtask, is_completed: !currentStatus }
          : subtask
      )
    );

    const success = await updateSubtask(subtaskId, {
      is_completed: !currentStatus,
    });
    if (success && onRefresh) {
      onRefresh();
      toast({
        title: !currentStatus ? "Subtarefa concluída" : "Subtarefa reaberta",
        description: "O status da subtarefa foi atualizado.",
      });
    } else if (!success) {
      // Reverter estado local se falhou
      setLocalSubtasks((prev) =>
        prev.map((subtask) =>
          subtask.id === subtaskId
            ? { ...subtask, is_completed: currentStatus }
            : subtask
        )
      );
    }
  };

  const getPriorityBadgeVariant = (priority: string | null) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "secondary";
      case "pending":
        return "outline";
      case "archived":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusText = (status: string | null) => {
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

  const getPriorityText = (priority: string | null) => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-sm dark:bg-gray-950/95 border-border/50 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            {activity.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status e Prioridade */}
          <div className="flex gap-3">
            <Badge
              variant={getStatusBadgeVariant(activity.status)}
              className={
                activity.status === "completed"
                  ? "bg-[#09b230] hover:bg-[#08a02b] text-white"
                  : ""
              }
            >
              {getStatusText(activity.status)}
            </Badge>
            {activity.priority && (
              <Badge variant={getPriorityBadgeVariant(activity.priority)}>
                Prioridade: {getPriorityText(activity.priority)}
              </Badge>
            )}
          </div>

          <Separator className="dark:bg-gray-800" />

          {/* Descrição */}
          {activity.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Descrição</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {activity.description}
              </p>
            </div>
          )}

          <Separator />

          {/* Informações Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Responsável */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Responsável</h3>
              </div>
              <p className="text-sm">
                {activity.profiles?.full_name || "Não informado"}
              </p>
            </div>

            {/* Subsetor */}
            {activity.subsectors && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Subsetor</h3>
                </div>
                <p className="text-sm">{activity.subsectors.name}</p>
              </div>
            )}

            {/* Data de Vencimento */}
            {activity.due_date && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Data de Vencimento</h3>
                </div>
                <p className="text-sm">
                  {format(
                    new Date(activity.due_date),
                    "dd 'de' MMMM 'de' yyyy",
                    {
                      locale: ptBR,
                    }
                  )}
                </p>
              </div>
            )}

            {/* Tempo Estimado */}
            {activity.estimated_time && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Tempo Estimado</h3>
                </div>
                <p className="text-sm">
                  {activity.estimated_time}{" "}
                  {activity.estimated_time === 1 ? "hora" : "horas"}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Subtarefas */}
          {localSubtasks && localSubtasks.length > 0 && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#09b230]" />
                  <h3 className="font-semibold text-sm text-foreground dark:text-white">
                    Subtarefas
                  </h3>
                </div>
                <div className="space-y-3">
                  {localSubtasks
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card/30 dark:bg-gray-800/30 dark:border-gray-700 hover:bg-muted/50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <button
                          className="flex items-center mt-0.5 hover:scale-110 transition-transform"
                          onClick={() =>
                            handleToggleSubtask(
                              subtask.id,
                              subtask.is_completed
                            )
                          }
                        >
                          {subtask.is_completed ? (
                            <div className="w-4 h-4 rounded bg-[#09b230] flex items-center justify-center cursor-pointer">
                              <svg
                                className="w-2.5 h-2.5 text-white"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded border-2 border-muted-foreground/30 hover:border-[#09b230] cursor-pointer transition-colors" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              subtask.is_completed
                                ? "line-through text-muted-foreground dark:text-gray-500"
                                : "text-foreground dark:text-white"
                            }`}
                          >
                            {subtask.title}
                          </p>
                          {subtask.description && (
                            <p
                              className={`text-xs mt-1 ${
                                subtask.is_completed
                                  ? "line-through text-muted-foreground dark:text-gray-500"
                                  : "text-muted-foreground dark:text-gray-400"
                              }`}
                            >
                              {subtask.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  {/* Barra de progresso */}
                  <div className="mt-4 p-3 bg-muted/30 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex justify-between text-xs text-muted-foreground dark:text-gray-400 mb-2">
                      <span className="font-medium">Progresso Geral</span>
                      <span className="font-semibold text-[#09b230]">
                        {localSubtasks.filter((s) => s.is_completed).length} de{" "}
                        {localSubtasks.length} concluídas
                      </span>
                    </div>
                    <div className="w-full bg-muted dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-[#09b230] h-2.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            (localSubtasks.filter((s) => s.is_completed)
                              .length /
                              localSubtasks.length) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-center text-[#09b230] font-semibold mt-1">
                      {Math.round(
                        (localSubtasks.filter((s) => s.is_completed).length /
                          localSubtasks.length) *
                          100
                      )}
                      % concluído
                    </div>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Datas de Controle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Data de Criação</h3>
              <p className="text-xs text-muted-foreground">
                {format(
                  new Date(activity.created_at),
                  "dd/MM/yyyy 'às' HH:mm",
                  {
                    locale: ptBR,
                  }
                )}
              </p>
            </div>

            {activity.updated_at &&
              activity.updated_at !== activity.created_at && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Última Atualização</h3>
                  <p className="text-xs text-muted-foreground">
                    {format(
                      new Date(activity.updated_at),
                      "dd/MM/yyyy 'às' HH:mm",
                      {
                        locale: ptBR,
                      }
                    )}
                  </p>
                </div>
              )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
