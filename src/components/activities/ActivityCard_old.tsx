import { Database } from "@/types/supabase";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { SubtaskPreview } from "@/components/activities/SubtaskPreview";
import { Activity } from "@/hooks/useActivities";
import { Calendar, Clock, User, CheckSquare } from "lucide-react";

interface ActivityCardProps {
  activity: Activity;
  onClick?: () => void; // Nova prop para o clique
}

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-yellow-500";
      case "archived":
        return "bg-gray-500";
      default:
        return "bg-blue-500";
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
    <Card
      className="cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-border/50 bg-card/80 backdrop-blur"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-semibold leading-tight line-clamp-2">
            {activity.title}
          </CardTitle>
          <div className={`w-3 h-3 rounded-full ${getStatusColor(activity.status)} flex-shrink-0 ml-2`} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 pt-0">
        {activity.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {activity.description}
          </p>
        )}

        {/* Informações compactas */}
        <div className="space-y-2">
          {activity.profiles?.full_name && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{activity.profiles.full_name}</span>
            </div>
          )}
          
          {activity.due_date && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(activity.due_date), "dd/MM/yyyy")}</span>
            </div>
          )}
        </div>

        {/* Progresso das subtarefas */}
        {activity.subtasks && activity.subtasks.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <CheckSquare className="h-3 w-3" />
                <span className="font-medium">Checklist</span>
              </div>
              <span className="font-semibold text-primary">
                {activity.subtasks.filter((s) => s.is_completed).length}/
                {activity.subtasks.length}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    activity.subtasks.length > 0
                      ? (activity.subtasks.filter((s) => s.is_completed).length /
                          activity.subtasks.length) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            {/* Preview dos itens */}
            <div className="space-y-1">
              {activity.subtasks.slice(0, 2).map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    subtask.is_completed ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`} />
                  <span className={`line-clamp-1 ${
                    subtask.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'
                  }`}>
                    {subtask.title}
                  </span>
                </div>
              ))}
              {activity.subtasks.length > 2 && (
                <div className="text-xs text-muted-foreground pl-4">
                  +{activity.subtasks.length - 2} itens restantes
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="flex gap-1 flex-wrap">
          <Badge variant="outline" className="text-xs px-2 py-0">
            {getStatusLabel(activity.status)}
          </Badge>
          {activity.priority && (
            <Badge 
              variant={activity.priority === "high" ? "destructive" : activity.priority === "medium" ? "secondary" : "outline"}
              className="text-xs px-2 py-0"
            >
              {getPriorityLabel(activity.priority)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
