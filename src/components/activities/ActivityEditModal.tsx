import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useGlobalEscClose } from "@/hooks/useGlobalEscClose";
import { X, Calendar, User, Flag, Clock } from "lucide-react";
import { Activity } from "@/hooks/useActivities";
import { ChecklistManager } from "@/components/activities/ChecklistManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuthFinal";
import { supabase } from "@/lib/supabase";

interface ActivityEditModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: Partial<Activity>) => Promise<void>;
  onDelete?: (activityId: string) => void;
  defaultDueDate?: Date; // opcional: define data inicial ao criar
  subsectorId?: string; // ID do subsetor para filtrar usuários
  isCreatingForPrivateList?: boolean; // indica se é criação para lista privada
}

export const ActivityEditModal: React.FC<ActivityEditModalProps> = ({
  activity,
  isOpen,
  onClose,
  onSave,
  onDelete,
  defaultDueDate,
  subsectorId,
  isCreatingForPrivateList = false,
}) => {
  const { profile, isManager, user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [status, setStatus] = useState<
    "pending" | "in_progress" | "completed" | "archived"
  >("pending");
  const [subtasks, setSubtasks] = useState<Activity["subtasks"]>([]);

  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>(
    []
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadActivityData = async () => {
      if (activity) {
        setTitle(activity.title || "");
        setDescription(activity.description || "");
        setDueDate(
          activity.due_date
            ? new Date(activity.due_date).toISOString().split("T")[0]
            : ""
        );
        setPriority(activity.priority || "medium");
        setStatus(activity.status || "pending");
        setSubtasks(activity.subtasks || []);

        // Carregar múltiplos responsáveis
        setAssigneeIds(activity.user_id ? [activity.user_id] : []);

        const maybePrivate = (activity as unknown as { is_private?: boolean })
          .is_private;
        setIsPrivate(Boolean(maybePrivate));
      } else {
        // Modo de criação
        setTitle("");
        setDescription("");
        setDueDate(
          defaultDueDate
            ? new Date(defaultDueDate).toISOString().split("T")[0]
            : ""
        );
        setPriority("medium");
        setStatus("pending");
        setSubtasks([]);
        setAssigneeIds(user?.id ? [user.id] : []);
        setIsPrivate(false);
      }
    };

    loadActivityData();
  }, [activity, defaultDueDate, user?.id]);

  // Resetar campos sempre que abrir em modo de criação (activity === null)
  useEffect(() => {
    if (isOpen && !activity) {
      setTitle("");
      setDescription("");
      setDueDate(
        defaultDueDate
          ? new Date(defaultDueDate).toISOString().split("T")[0]
          : ""
      );
      setPriority("medium");
      setStatus("pending");
      setSubtasks([]);
      setAssigneeIds(user?.id ? [user.id] : []);
      setIsPrivate(false);
    }
  }, [isOpen, activity, defaultDueDate, user?.id]);

  // ESC fecha modal
  // When ESC or backdrop click occurs we want to auto-save then close
  const handleAutoClose = async () => {
    // If already saving, do nothing (avoid duplicate saves)
    if (isSaving) return;
    try {
      await handleSave();
    } catch (e) {
      // swallow - handleSave already handles errors and shows toast
    } finally {
      onClose();
    }
  };

  useGlobalEscClose(isOpen, handleAutoClose, 160);

  // Bloquear scroll do body quando o modal estiver aberto para evitar "pulo"/reflow ao abrir dropdowns
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // Carregar usuários do setor/subsetor para gestores
  useEffect(() => {
    const loadUsers = async () => {
      if (!isOpen) return;
      if (isManager && profile?.sector_id) {
        let list: Array<{ id: string; full_name: string }> = [];

        // Usar subsectorId da prop ou da atividade existente
        const targetSubsectorId = subsectorId || activity?.subsector_id;

        if (targetSubsectorId) {
          // Buscar usuários do subsetor específico
          const { data: oldUsers } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("sector_id", profile.sector_id)
            .eq("subsector_id", targetSubsectorId);

          list = oldUsers || [];
        } else {
          // Sem subsetor específico, buscar todos do setor
          const { data } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("sector_id", profile.sector_id)
            .order("full_name");
          list = data || [];
        }

        // Garante que o usuário atual apareça na lista
        if (
          user &&
          !list.find((u) => u.id === user.id) &&
          user.user_metadata?.full_name
        ) {
          list = [
            ...list,
            { id: user.id, full_name: user.user_metadata.full_name },
          ];
        }

        setUsers(list.sort((a, b) => a.full_name.localeCompare(b.full_name)));
      } else if (user) {
        // Colaborador: apenas ele mesmo
        const fullName =
          (user.user_metadata && (user.user_metadata.full_name as string)) ||
          "Você";
        setUsers([{ id: user.id, full_name: fullName }]);
      }
    };
    loadUsers();
  }, [isManager, profile?.sector_id, isOpen, user, subsectorId, activity]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedActivity: Partial<Activity> = {
        ...(activity && { id: activity.id }),
        title,
        description,
        due_date: dueDate || null,
        priority,
        status,
        subtasks: subtasks,
        is_private: isPrivate,
        user_id: assigneeIds[0] || user?.id,
      };

      await onSave(updatedActivity);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[160] grid place-items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleAutoClose}
      />

      {/* Modal */}
      <div className="relative w-[95vw] max-w-4xl max-h-[90vh] bg-background border rounded-2xl shadow-2xl overflow-hidden z-[160]">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur border-b px-6 py-4 flex items-center justify-between z-[170]">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {title || (activity ? "Editar Atividade" : "Nova Atividade")}
            {isPrivate && (
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
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Digite o título da atividade..."
                className="text-lg font-medium"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2 pt-4 mt-2 border-t border-gray-200 dark:border-gray-800/60">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Adicione uma descrição mais detalhada..."
                rows={4}
              />
            </div>

            {/* Campos de controle */}
            <div
              className={`grid grid-cols-1 gap-4 pt-4 mt-2 border-t border-gray-200 dark:border-gray-800/60 ${
                isCreatingForPrivateList ? "md:grid-cols-2" : "md:grid-cols-3"
              }`}
            >
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(value: typeof status) => setStatus(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[250]">
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={priority}
                  onValueChange={(value: typeof priority) => setPriority(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[250]">
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isManager && !isCreatingForPrivateList && (
                <div className="space-y-2">
                  <Label>Responsáveis</Label>
                  <MultiSelect
                    options={users.map((u) => ({
                      value: u.id,
                      label: u.full_name,
                    }))}
                    selected={assigneeIds}
                    onChange={setAssigneeIds}
                    placeholder="Selecione responsáveis"
                  />
                </div>
              )}
            </div>

            {/* Checklist Manager */}
            <div className="pt-4 mt-2 border-t border-gray-200 dark:border-gray-800/60">
              <ChecklistManager
                subtasks={subtasks}
                onSubtasksChange={setSubtasks}
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t px-6 py-4 flex items-center justify-between z-[170]">
          <div>
            {activity && onDelete && (
              <Button
                variant="destructive"
                onClick={() => onDelete(activity.id)}
              >
                Arquivar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : activity ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
