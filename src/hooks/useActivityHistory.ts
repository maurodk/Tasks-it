import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/types/supabase";

export interface ActivityHistoryEntry {
  id: string;
  activity_id: string;
  action: Database["public"]["Enums"]["activity_action"];
  old_status?: Database["public"]["Enums"]["activity_status"] | null;
  new_status?: Database["public"]["Enums"]["activity_status"] | null;
  performed_by: string;
  activity_title: string;
  activity_description?: string | null;
  subsector_id?: string | null;
  sector_id: string;
  details: Record<string, unknown>;
  created_at: string;
  performer?: {
    full_name: string;
    avatar_url?: string | null;
  };
  subsector?: {
    name: string;
  };
}

interface UseActivityHistoryOptions {
  limit?: number;
  activityId?: string; // Para filtrar histórico de uma atividade específica
  subsectorId?: string; // Filtrar por subsetor
  dateFrom?: string; // ISO date (YYYY-MM-DD)
  dateTo?: string; // ISO date (YYYY-MM-DD)
}

export function useActivityHistory(options: UseActivityHistoryOptions = {}) {
  const [history, setHistory] = useState<ActivityHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchHistory = useCallback(async () => {
    if (!profile?.sector_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Primeiro verifica se a tabela existe
      const { error: tableError } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("activity_history" as any)
        .select("id")
        .limit(1);

      if (tableError) {
        // Se a tabela não existe, mostra uma mensagem amigável
        if (
          tableError.message.includes(
            'relation "activity_history" does not exist'
          )
        ) {
          setError(
            "A tabela de histórico ainda não foi criada. Execute o script SQL no Supabase."
          );
          setHistory([]);
          setLoading(false);
          return;
        }
        throw tableError;
      }

      let query = supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("activity_history" as any)
        .select(
          `
          *,
          performer:profiles!performed_by (
            full_name,
            avatar_url
          ),
          subsector:subsectors!subsector_id (
            name
          )
        `
        )
        .eq("sector_id", profile.sector_id)
        .order("created_at", { ascending: false });

      // Aplicar filtros baseados no role
      if (profile.role === "collaborator" && profile.subsector_id) {
        query = query.eq("subsector_id", profile.subsector_id);
      }

      // Filtrar por atividade específica se fornecido
      if (options.activityId) {
        query = query.eq("activity_id", options.activityId);
      }

      // Filtro por subsetor se fornecido
      if (options.subsectorId) {
        const value = options.subsectorId;
        const isUuid = /^[0-9a-fA-F-]{36}$/.test(value);
        if (isUuid) {
          query = query.eq("subsector_id", value);
        } else {
          // Filtra pelo nome do subsetor via alias da relação usado no select
          // select usa: subsector:subsectors!subsector_id (name)
          query = query.eq("subsector.name", value);
        }
      }

      // Filtro por intervalo de datas
      if (options.dateFrom) {
        // include whole day start
        query = query.gte("created_at", `${options.dateFrom}T00:00:00.000Z`);
      }
      if (options.dateTo) {
        // include whole day end by adding one day and using lt
        const to = new Date(options.dateTo);
        to.setDate(to.getDate() + 1);
        query = query.lt("created_at", to.toISOString());
      }

      // Aplicar limite se fornecido
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setHistory(data as unknown as ActivityHistoryEntry[]);
    } catch (err: unknown) {
      console.error("Erro ao carregar histórico:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao carregar histórico";
      setError(errorMessage);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico das atividades.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    profile?.sector_id,
    profile?.role,
    profile?.subsector_id,
    options.activityId,
    options.limit,
    options.subsectorId,
    options.dateFrom,
    options.dateTo,
    toast,
  ]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Função auxiliar para converter status em texto legível
  const getStatusText = useCallback(
    (
      status: Database["public"]["Enums"]["activity_status"] | null | undefined
    ): string => {
      switch (status) {
        case "pending":
          return "Pendente";
        case "in_progress":
          return "Em Progresso";
        case "completed":
          return "Concluída";
        case "archived":
          return "Arquivada";
        default:
          return "Desconhecido";
      }
    },
    []
  );

  // Função para obter o texto descritivo da ação
  const getActionDescription = useCallback(
    (entry: ActivityHistoryEntry): string => {
      const performer = entry.performer?.full_name || "Usuário desconhecido";

      switch (entry.action) {
        case "created":
          return `${performer} criou a atividade`;
        case "status_changed": {
          const oldStatusText = getStatusText(entry.old_status);
          const newStatusText = getStatusText(entry.new_status);
          return `${performer} alterou o status de "${oldStatusText}" para "${newStatusText}"`;
        }
        case "archived":
          return `${performer} arquivou a atividade`;
        case "unarchived":
          return `${performer} desarquivou a atividade`;
        case "deleted":
          return `${performer} excluiu a atividade`;
        case "updated": {
          const changes = entry.details?.changes as
            | Record<string, boolean>
            | undefined;
          if (changes) {
            const changedFields = [];
            if (changes.title_changed) changedFields.push("título");
            if (changes.description_changed) changedFields.push("descrição");
            if (changes.priority_changed) changedFields.push("prioridade");
            if (changes.due_date_changed)
              changedFields.push("data de vencimento");
            if (changes.assigned_to_changed) changedFields.push("responsável");

            if (changedFields.length > 0) {
              return `${performer} atualizou ${changedFields.join(", ")}`;
            }
          }
          return `${performer} atualizou a atividade`;
        }
        default:
          return `${performer} realizou uma ação`;
      }
    },
    [getStatusText]
  );

  // Função para obter a cor do badge baseado na ação
  const getActionColor = useCallback((action: string): string => {
    switch (action) {
      case "created":
        return "bg-green-100 text-green-800 border-green-200";
      case "status_changed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "archived":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "unarchived":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "deleted":
        return "bg-red-100 text-red-800 border-red-200";
      case "updated":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }, []);

  return {
    history,
    loading,
    error,
    refetch: fetchHistory,
    getActionDescription,
    getActionColor,
    getStatusText,
  };
}
