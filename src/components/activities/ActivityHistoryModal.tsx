import { useState } from "react";
import { useGlobalEscClose } from "@/hooks/useGlobalEscClose";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  RefreshCw,
  Clock,
  User,
  Activity,
  Archive,
  Edit,
  Trash2,
} from "lucide-react";
import {
  useActivityHistory,
  ActivityHistoryEntry,
} from "@/hooks/useActivityHistory";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId?: string; // Se fornecido, mostra histórico de uma atividade específica
  title?: string; // Título customizado para o modal
}

export function ActivityHistoryModal({
  open,
  onOpenChange,
  activityId,
  title = "Histórico de Atividades",
}: ActivityHistoryModalProps) {
  const [refreshing, setRefreshing] = useState(false);
  useGlobalEscClose(open, () => onOpenChange(false));
  const [subsectorFilter, setSubsectorFilter] = useState<string | "all">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const {
    history,
    loading,
    error,
    refetch,
    getActionDescription,
    getActionColor,
  } = useActivityHistory({
    activityId,
    limit: activityId ? undefined : 50, // Limitar a 50 para histórico geral
    subsectorId: subsectorFilter === "all" ? undefined : subsectorFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return <Activity className="h-4 w-4" />;
      case "status_changed":
        return <RefreshCw className="h-4 w-4" />;
      case "archived":
      case "unarchived":
        return <Archive className="h-4 w-4" />;
      case "updated":
        return <Edit className="h-4 w-4" />;
      case "deleted":
        return <Trash2 className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "Data inválida";
    }
  };

  // Agrupar histórico por data
  const groupHistoryByDate = (entries: ActivityHistoryEntry[]) => {
    const groups = new Map<string, ActivityHistoryEntry[]>();

    entries.forEach((entry) => {
      const date = new Date(entry.created_at).toLocaleDateString("pt-BR");
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(entry);
    });

    return Array.from(groups.entries()).sort(([a], [b]) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });
  };

  const historyGroups = groupHistoryByDate(history);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-foreground dark:text-white" />
            {title}
            {activityId && history.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                - {history[0]?.activity_title}
              </span>
            )}
          </DialogTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                } text-foreground dark:text-white`}
              />
              Atualizar
            </Button>
            {!activityId && (
              <>
                <select
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={subsectorFilter}
                  onChange={(e) =>
                    setSubsectorFilter(e.target.value as "all" | string)
                  }
                >
                  <option value="all">Todos os subsetores</option>
                  {/* Options should be provided by caller or fetched; simple dynamic list based on current entries */}
                  {[...new Set(history.map((h) => h.subsector?.name || ""))]
                    .filter(Boolean)
                    .map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                </select>
                <input
                  type="date"
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <input
                  type="date"
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </>
            )}
            {history.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {history.length} {history.length === 1 ? "entrada" : "entradas"}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 mt-4 h-[60vh] overflow-y-auto border rounded-md">
          <div className="space-y-4 p-4">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-foreground dark:text-white" />
                <span className="ml-2">Carregando histórico...</span>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-red-500 mb-2">Erro ao carregar histórico</p>
                <div className="text-xs text-muted-foreground mb-4 p-3 bg-muted rounded-md max-w-md">
                  <p className="font-medium mb-1">Detalhes do erro:</p>
                  <p>{error}</p>
                  {error.includes("relation") && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded text-yellow-800">
                      <p className="font-medium">💡 Solução:</p>
                      <p>
                        Execute o script SQL no Supabase para criar a tabela de
                        histórico.
                      </p>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {!loading && !error && history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground dark:text-white mb-4" />
                <p className="text-muted-foreground">
                  {activityId
                    ? "Nenhum histórico encontrado para esta atividade"
                    : "Nenhum histórico de atividades encontrado"}
                </p>
              </div>
            )}

            {!loading && !error && history.length > 0 && (
              <div className="space-y-6">
                {historyGroups.map(([date, entries]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {date}
                      </h3>
                      <Separator className="flex-1" />
                    </div>

                    <div className="space-y-3">
                      {entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-3 p-4 rounded-lg border bg-card"
                        >
                          {/* Avatar do usuário */}
                          <Avatar className="h-8 w-8 mt-1">
                            <AvatarImage
                              src={entry.performer?.avatar_url || undefined}
                            />
                            <AvatarFallback>
                              {entry.performer?.full_name?.charAt(0) || (
                                <User className="h-4 w-4" />
                              )}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            {/* Linha superior: Ação e Badge */}
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className={`text-xs flex items-center gap-1 ${getActionColor(
                                  entry.action
                                )}`}
                              >
                                {getActionIcon(entry.action)}
                                {entry.action === "created" && "Criada"}
                                {entry.action === "status_changed" && "Status"}
                                {entry.action === "archived" && "Arquivada"}
                                {entry.action === "unarchived" &&
                                  "Desarquivada"}
                                {entry.action === "deleted" && "Excluída"}
                                {entry.action === "updated" && "Atualizada"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(entry.created_at)}
                              </span>
                            </div>

                            {/* Descrição da ação */}
                            <p className="text-sm text-foreground mb-2">
                              {getActionDescription(entry)}
                            </p>

                            {/* Informações da atividade (apenas no histórico geral) */}
                            {!activityId && (
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Activity className="h-3 w-3 text-foreground dark:text-white" />
                                  {entry.activity_title}
                                  {entry.action === "deleted" && (
                                    <span className="text-red-500 font-medium">
                                      (Excluída)
                                    </span>
                                  )}
                                </span>
                                {entry.subsector?.name && (
                                  <span>Subsetor: {entry.subsector.name}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
