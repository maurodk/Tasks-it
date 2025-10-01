import React from "react";
import {
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Calendar,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SearchActivity } from "@/hooks/useActivitySearch";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SearchDropdownProps {
  results: SearchActivity[];
  isSearching: boolean;
  searchQuery: string;
  onClearSearch: () => void;
  onSelectActivity?: (activity: SearchActivity) => void;
}

export function SearchDropdown({
  results,
  isSearching,
  searchQuery,
  onClearSearch,
  onSelectActivity,
}: SearchDropdownProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        );
      case "in_progress":
        return (
          <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        );
      case "pending":
        return (
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        );
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Concluída";
      case "in_progress":
        return "Em Progresso";
      case "pending":
        return "Pendente";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
      case "pending":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
    }
  };

  if (!searchQuery) return null;

  return (
    <div className="dark:bg-[#0f0f0f] absolute top-full left-0 right-0 mt-2 bg-card border border-border/50 rounded-lg shadow-2xl z-[9999] max-h-96 overflow-y-auto backdrop-blur-md ring-1 ring-black/5">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Search className="h-4 w-4" />
          <span>
            {isSearching
              ? "Buscando..."
              : `${results.length} resultado${
                  results.length !== 1 ? "s" : ""
                } encontrado${results.length !== 1 ? "s" : ""}`}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSearch}
          className="h-6 w-6 p-0 hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Loading */}
      {isSearching && (
        <div className="p-6 text-center">
          <div className="w-6 h-6 border-2 border-[#09b230] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Buscando atividades...
          </p>
        </div>
      )}

      {/* No results */}
      {!isSearching && results.length === 0 && (
        <div className="p-6 text-center">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhuma atividade encontrada para "{searchQuery}"
          </p>
        </div>
      )}

      {/* Results */}
      {!isSearching && results.length > 0 && (
        <div className="py-2">
          {results.map((activity) => (
            <div
              key={activity.id}
              className="px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/30 last:border-b-0"
              onClick={() => onSelectActivity?.(activity)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(activity.status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-medium text-sm text-foreground truncate pr-2">
                      {activity.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs flex-shrink-0",
                        getStatusColor(activity.status)
                      )}
                    >
                      {getStatusText(activity.status)}
                    </Badge>
                  </div>

                  {activity.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {activity.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {activity.profiles?.full_name && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{activity.profiles.full_name}</span>
                      </div>
                    )}

                    {activity.due_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(activity.due_date), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    )}

                    {activity.subsectors?.name && (
                      <Badge variant="secondary" className="h-4 text-xs">
                        {activity.subsectors.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
