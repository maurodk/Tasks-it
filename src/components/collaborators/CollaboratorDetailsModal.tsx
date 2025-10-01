import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, AlertCircle, Calendar, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface Collaborator {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  sector_id?: string;
  subsector_id?: string;
  sectors?: {
    name: string;
  };
  subsectors?: {
    name: string;
  };
}

interface Activity {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "archived";
  priority: "low" | "medium" | "high";
  due_date: string;
  created_at: string;
  subsectors?: {
    name: string;
  };
  subtasks: {
    id: string;
    title: string;
    is_completed: boolean;
  }[];
}

interface CollaboratorDetailsModalProps {
  collaborator: Collaborator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CollaboratorDetailsModal({
  collaborator,
  open,
  onOpenChange,
}: CollaboratorDetailsModalProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCollaboratorActivities = useCallback(async () => {
    if (!collaborator?.id || !open) return;

    setLoading(true);
    try {
      // Temporary mock data to avoid Supabase type issues
      // TODO: Replace with actual Supabase query when type issues are resolved
      const mockActivities: Activity[] = [
        {
          id: "1",
          title: "Exemplo de Atividade",
          description: "Esta é uma atividade de exemplo",
          status: "in_progress",
          priority: "medium",
          due_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          subtasks: [],
        },
      ];

      setActivities(mockActivities);
    } catch (error: unknown) {
      console.error("Erro ao buscar atividades:", error);
      toast({
        title: "Erro ao carregar atividades",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [collaborator?.id, open]);

  useEffect(() => {
    if (open && collaborator) {
      fetchCollaboratorActivities();
    }
  }, [open, collaborator, fetchCollaboratorActivities]);

  const getStatusIcon = (status: Activity["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Activity["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const getPriorityColor = (priority: Activity["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      case "medium":
        return "bg-orange-100 text-orange-800 hover:bg-orange-200";
      case "low":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const getCompletedSubtasks = (subtasks: Activity["subtasks"]) => {
    if (!Array.isArray(subtasks)) return 0;
    return subtasks.filter((subtask) => subtask.is_completed).length;
  };

  const getTotalSubtasks = (subtasks: Activity["subtasks"]) => {
    if (!Array.isArray(subtasks)) return 0;
    return subtasks.length;
  };

  const getActivityProgress = (activity: Activity) => {
    const total = getTotalSubtasks(activity.subtasks);
    if (total === 0) {
      return activity.status === "completed" ? 100 : 0;
    }
    const completed = getCompletedSubtasks(activity.subtasks);
    return Math.round((completed / total) * 100);
  };

  const getOverallProgress = () => {
    if (activities.length === 0) return 0;
    const totalProgress = activities.reduce((sum, activity) => {
      return sum + getActivityProgress(activity);
    }, 0);
    return Math.round(totalProgress / activities.length);
  };

  const getActivitiesStats = () => {
    const completed = activities.filter(
      (activity) => activity.status === "completed"
    ).length;
    const inProgress = activities.filter(
      (activity) => activity.status === "in_progress"
    ).length;
    const pending = activities.filter(
      (activity) => activity.status === "pending"
    ).length;

    return { completed, inProgress, pending, total: activities.length };
  };

  if (!collaborator) return null;

  const stats = getActivitiesStats();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Colaborador</DialogTitle>
          <DialogDescription>
            Informações detalhadas e atividades atribuídas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={collaborator.avatar_url}
                    alt={collaborator.full_name}
                  />
                  <AvatarFallback className="text-lg">
                    {collaborator.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {collaborator.full_name}
                  </h3>
                  <p className="text-gray-600 mb-2">{collaborator.email}</p>
                  <div className="flex items-center space-x-4">
                    <Badge variant="secondary" className="capitalize">
                      <User className="h-3 w-3 mr-1" />
                      {collaborator.role}
                    </Badge>
                    {collaborator.sectors && (
                      <Badge variant="outline">
                        {collaborator.sectors.name}
                      </Badge>
                    )}
                    {collaborator.subsectors && (
                      <Badge variant="outline">
                        {collaborator.subsectors.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div
                    className="text-2xl font-bold"
                    style={{ color: "#2563eb" }}
                  >
                    {stats.total}
                  </div>
                  <div className="text-sm text-gray-600">
                    Total de Atividades
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div
                    className="text-2xl font-bold"
                    style={{ color: "#16a34a" }}
                  >
                    {stats.completed}
                  </div>
                  <div className="text-sm text-gray-600">Concluídas</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div
                    className="text-2xl font-bold"
                    style={{ color: "#ca8a04" }}
                  >
                    {stats.inProgress}
                  </div>
                  <div className="text-sm text-gray-600">Em Progresso</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div
                    className="text-2xl font-bold"
                    style={{ color: "#ea580c" }}
                  >
                    {stats.pending}
                  </div>
                  <div className="text-sm text-gray-600">Pendentes</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Overall Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Progresso Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso das Atividades</span>
                  <span>{getOverallProgress()}%</span>
                </div>
                <Progress value={getOverallProgress()} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Activities Section */}
          <Card>
            <CardHeader>
              <CardTitle>Atividades Atribuídas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Carregando atividades...</p>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhuma atividade encontrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <Card key={activity.id} className="border border-gray-200">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold text-gray-900 flex-1">
                              {activity.title}
                            </h4>
                            <div className="flex items-center space-x-2 ml-4">
                              <Badge
                                className={getStatusColor(activity.status)}
                              >
                                {getStatusIcon(activity.status)}
                                <span className="ml-1 capitalize">
                                  {activity.status === "in_progress"
                                    ? "Em Progresso"
                                    : activity.status === "completed"
                                    ? "Concluída"
                                    : "Pendente"}
                                </span>
                              </Badge>
                              <Badge
                                className={getPriorityColor(activity.priority)}
                              >
                                Prioridade{" "}
                                {activity.priority === "high"
                                  ? "Alta"
                                  : activity.priority === "medium"
                                  ? "Média"
                                  : "Baixa"}
                              </Badge>
                            </div>
                          </div>

                          {activity.description && (
                            <p className="text-gray-600 text-sm">
                              {activity.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(activity.due_date).toLocaleDateString(
                                  "pt-BR"
                                )}
                              </div>
                              {activity.subsectors && (
                                <span className="text-blue-600">
                                  {activity.subsectors.name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Subtasks Progress */}
                          {getTotalSubtasks(activity.subtasks) > 0 && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>
                                    Subtarefas (
                                    {getCompletedSubtasks(activity.subtasks)}/
                                    {getTotalSubtasks(activity.subtasks)})
                                  </span>
                                  <span>{getActivityProgress(activity)}%</span>
                                </div>
                                <Progress
                                  value={getActivityProgress(activity)}
                                  className="h-1.5"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
