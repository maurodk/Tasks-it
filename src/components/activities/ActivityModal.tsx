import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Calendar,
  Clock,
  AlertCircle,
  User,
  Archive,
  Target,
  Plus,
  X,
  Check,
  Edit3,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Activity, useActivities } from "@/hooks/useActivities";
import { SubtaskManager } from "@/components/activities/SubtaskManager";
import { Separator } from "@/components/ui/separator";
import { useSubtasks } from "@/hooks/useSubtasks";
import { MultiSelect } from "@/components/ui/multi-select";

const activitySchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  estimated_time: z.number().min(1, "Tempo deve ser maior que 0").optional(),
  due_date: z.date().optional(),
  user_id: z.string().min(1, "Usuário é obrigatório"),
  subsector_id: z.string().optional(),
});

type ActivityFormData = z.infer<typeof activitySchema>;

interface ActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: Activity;
  onSuccess?: () => void;
  defaultSubsectorId?: string; // Novo: para pré-selecionar subsetor
  defaultDueDate?: Date; // Novo: para pré-definir data de vencimento
  onRefresh?: () => void; // Para atualizar as atividades após mudanças em subtarefas
  readOnly?: boolean; // Para forçar modo somente leitura (usado para atividades arquivadas)
  isCreatingForPrivateList?: boolean; // Para identificar criação de atividade privada
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: "manager" | "collaborator";
  subsector_id: string | null;
}

interface Subsector {
  id: string;
  name: string;
}

export function ActivityModal({
  open,
  onOpenChange,
  activity,
  onSuccess,
  defaultSubsectorId,
  defaultDueDate,
  onRefresh,
  readOnly = false,
  isCreatingForPrivateList = false,
}: ActivityModalProps) {
  const { profile, user, isManager } = useAuth();
  const { toast } = useToast();

  // Função para garantir que a data tenha horário 23:59:59
  const getDefaultDueDate = useCallback(() => {
    if (defaultDueDate) {
      const date = new Date(defaultDueDate);
      date.setHours(23, 59, 59, 999);
      return date;
    }

    // Se não há data específica, usar hoje às 23:59:59
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
  }, [defaultDueDate]);

  // Estabilizar as options para evitar re-renders infinitos
  const activitiesOptions = useMemo(() => ({}), []);
  const { archiveActivity, updateActivityStatus } =
    useActivities(activitiesOptions);
  const { addSubtask } = useSubtasks();

  const [loading, setLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [subsectors, setSubsectors] = useState<Subsector[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [tempSubtasks, setTempSubtasks] = useState<
    Array<{
      id: string;
      title: string;
      description?: string;
    }>
  >([]);

  const isEditing = !!activity;

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      estimated_time: undefined,
      due_date: getDefaultDueDate(),
      user_id: user?.id || "",
      subsector_id: defaultSubsectorId || "",
    },
  });

  // Fetch users in the same sector (only for managers)
  useEffect(() => {
    if (isManager && profile?.sector_id && open) {
      const fetchUsers = async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, subsector_id")
          .eq("sector_id", profile.sector_id);

        if (!error && data) {
          setUsers(data);
        }
      };
      fetchUsers();
    }
  }, [isManager, profile?.sector_id, open]);

  // Fetch subsectors
  useEffect(() => {
    if (profile?.sector_id && open) {
      const fetchSubsectors = async () => {
        const { data, error } = await supabase
          .from("subsectors")
          .select("id, name")
          .eq("sector_id", profile.sector_id);

        if (!error && data) {
          setSubsectors(data);
        }
      };
      fetchSubsectors();
    }
  }, [profile?.sector_id, open]);

  // Reset form when activity changes
  useEffect(() => {
    if (activity) {
      form.reset({
        title: activity.title || "",
        description: activity.description || "",
        priority: activity.priority || "medium",
        estimated_time: activity.estimated_time || undefined,
        due_date: activity.due_date ? new Date(activity.due_date) : undefined,
        user_id: activity.user_id || user?.id || "",
        subsector_id: activity.subsector_id || "",
      });
      setSelectedUsers(activity.user_id ? [activity.user_id] : []);
    } else {
      form.reset({
        title: "",
        description: "",
        priority: "medium",
        estimated_time: undefined,
        due_date: getDefaultDueDate(),
        user_id: user?.id || "",
        subsector_id: defaultSubsectorId || "",
      });
      setSelectedUsers(user?.id ? [user.id] : []);
    }
  }, [activity, user?.id, defaultSubsectorId, getDefaultDueDate, form]);

  // Auto-fill subsector when user is selected
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "user_id" && value.user_id && isManager && selectedUsers.length === 1) {
        const selectedUser = users.find((u) => u.id === selectedUsers[0]);
        if (selectedUser?.subsector_id) {
          form.setValue("subsector_id", selectedUser.subsector_id);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, users, isManager, selectedUsers]);

  const onSubmit = async (data: ActivityFormData) => {
    if (!profile?.sector_id) return;

    setLoading(true);
    try {
      const activityData = {
        ...data,
        sector_id: profile.sector_id,
        created_by: user?.id,
        due_date: data.due_date?.toISOString() || null,
        estimated_time: data.estimated_time || null,
        subsector_id: data.subsector_id || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("activities")
          .update(activityData)
          .eq("id", activity.id);

        if (error) throw error;

        toast({
          title: "Atividade atualizada",
          description: "A atividade foi atualizada com sucesso.",
        });
      } else {
        const { data: newActivity, error } = await supabase
          .from("activities")
          .insert(activityData)
          .select()
          .single();

        if (error) throw error;

        // Criar subtarefas se existirem usando o hook useSubtasks
        if (tempSubtasks.length > 0 && newActivity) {
          // Usar o addSubtask do hook já instanciado
          for (const subtask of tempSubtasks) {
            await addSubtask(
              newActivity.id,
              subtask.title,
              subtask.description
            );
          }
        }

        toast({
          title: "Atividade criada",
          description: "A atividade foi criada com sucesso.",
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Erro",
        description: err.message || "Erro ao salvar atividade.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!activity) return;

    setArchiveLoading(true);
    try {
      await archiveActivity(activity.id);
      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Erro",
        description: err.message || "Erro ao arquivar atividade.",
        variant: "destructive",
      });
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleRevertStatus = async (newStatus: "pending" | "in_progress") => {
    if (!activity) return;

    try {
      await updateActivityStatus(activity.id, newStatus);
      toast({
        title: "Status alterado",
        description: `Atividade voltou para ${
          newStatus === "pending" ? "Pendente" : "Em Andamento"
        }.`,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Erro",
        description: err.message || "Erro ao alterar status da atividade.",
        variant: "destructive",
      });
    }
  };

  const [isEditMode, setIsEditMode] = useState(false);

  const toggleEditMode = () => {
    if (!readOnly) {
      setIsEditMode(!isEditMode);
    }
  };

  const priorityColors = {
    low: "text-green-600",
    medium: "text-yellow-600",
    high: "text-red-600",
  };

  const priorityLabels = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
  };

  // Funções para gerenciar subtarefas temporárias
  const addTempSubtask = (title: string, description?: string) => {
    const newSubtask = {
      id: crypto.randomUUID(),
      title,
      description,
    };
    setTempSubtasks((prev) => [...prev, newSubtask]);
  };

  const removeTempSubtask = (id: string) => {
    setTempSubtasks((prev) => prev.filter((subtask) => subtask.id !== id));
  };

  const updateTempSubtask = (
    id: string,
    title: string,
    description?: string
  ) => {
    setTempSubtasks((prev) =>
      prev.map((subtask) =>
        subtask.id === id ? { ...subtask, title, description } : subtask
      )
    );
  };

  // Resetar estado quando modal fecha ou muda de modo
  useEffect(() => {
    if (!open) {
      setTempSubtasks([]);
      form.reset();
      setIsEditMode(false); // Reset edit mode quando o modal fechar
    }
  }, [open, form]);

  // Força modo de visualização quando readOnly for true
  useEffect(() => {
    if (readOnly) {
      setIsEditMode(false);
    }
  }, [readOnly]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {isEditing ? "Editar Atividade" : "Nova Atividade"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Edite os detalhes da atividade abaixo."
                  : "Preencha os dados para criar uma nova atividade."}
              </DialogDescription>
            </div>
            {isEditing && !readOnly && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleEditMode}
                  className="h-8 w-8 p-0"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                {activity?.status === "completed" && (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevertStatus("in_progress")}
                      className="h-8 w-8 p-0 text-yellow-600 hover:text-yellow-700"
                      title="Voltar para Em Andamento"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevertStatus("pending")}
                      className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                      title="Voltar para Pendente"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o título da atividade"
                      className="focus:border-[#09b230] focus:ring-[#09b230] focus-visible:ring-[#09b230]"
                      readOnly={readOnly || (isEditing && !isEditMode)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva os detalhes da atividade"
                      className="resize-none focus:border-[#09b230] focus:ring-[#09b230] focus-visible:ring-[#09b230]"
                      readOnly={readOnly || (isEditing && !isEditMode)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={readOnly || (isEditing && !isEditMode)}
                    >
                      <FormControl>
                        <SelectTrigger className="focus:border-[#09b230] focus:ring-[#09b230] focus-visible:ring-[#09b230]">
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="z-[250]">
                        {Object.entries(priorityLabels).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                <AlertCircle
                                  className={cn(
                                    "h-4 w-4",
                                    priorityColors[
                                      value as keyof typeof priorityColors
                                    ]
                                  )}
                                />
                                {label}
                              </div>
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimated_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo Estimado (horas)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="1"
                          placeholder="Ex: 2"
                          className="pl-10 focus:border-[#09b230] focus:ring-[#09b230] focus-visible:ring-[#09b230]"
                          readOnly={readOnly || (isEditing && !isEditMode)}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(
                              value === "" ? undefined : Number(value)
                            );
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Vencimento</FormLabel>
                  <Popover>
                    <PopoverTrigger
                      asChild
                      disabled={readOnly || (isEditing && !isEditMode)}
                    >
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal focus:border-[#09b230] focus:ring-[#09b230]",
                            !field.value && "text-muted-foreground",
                            (readOnly || (isEditing && !isEditMode)) &&
                              "opacity-50 cursor-not-allowed"
                          )}
                          disabled={readOnly || (isEditing && !isEditMode)}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <Calendar className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[250]" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Data limite para conclusão da atividade (opcional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isManager && users.length > 0 && !isCreatingForPrivateList && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Responsáveis</label>
                <MultiSelect
                  options={users.map(u => ({ value: u.id, label: u.full_name }))}
                  selected={selectedUsers}
                  onChange={(selected) => {
                    setSelectedUsers(selected);
                    form.setValue("user_id", selected[0] || "");
                  }}
                  placeholder="Selecione responsáveis"
                  disabled={readOnly || (isEditing && !isEditMode)}
                />
              </div>
            )}

            {subsectors.length > 0 && (
              <FormField
                control={form.control}
                name="subsector_id"
                render={({ field }) => {
                  // Check if the current subsector was auto-filled from user selection
                  const selectedUserId = form.watch("user_id");
                  const selectedUser = users.find(
                    (u) => u.id === selectedUserId
                  );
                  const isAutoFilled =
                    isManager &&
                    selectedUser?.subsector_id === field.value &&
                    field.value;

                  return (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        Subsetor
                        {isAutoFilled && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => form.setValue("subsector_id", "")}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Limpar
                          </Button>
                        )}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={
                          !!isAutoFilled ||
                          readOnly ||
                          (isEditing && !isEditMode)
                        }
                      >
                        <FormControl>
                          <SelectTrigger
                            className={cn(
                              "focus:border-[#09b230] focus:ring-[#09b230] focus-visible:ring-[#09b230]",
                              isAutoFilled && "opacity-75 cursor-not-allowed"
                            )}
                          >
                            <SelectValue placeholder="Selecione um subsetor (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="z-[250]">
                          {subsectors.map((subsector) => (
                            <SelectItem key={subsector.id} value={subsector.id}>
                              {subsector.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {isAutoFilled
                          ? "Subsetor preenchido automaticamente baseado no responsável selecionado"
                          : "Associe a atividade a um subsetor específico (opcional)"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            )}

            {/* Subtarefas */}
            <Separator className="my-6" />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-[#09b230]" />
                <h3 className="font-medium">Subtarefas / Checklist</h3>
              </div>
              {activity ? (
                <SubtaskManager
                  activityId={activity.id}
                  subtasks={activity.subtasks || []}
                  onSubtasksChange={() => onRefresh?.()}
                  disabled={loading}
                />
              ) : (
                <TempSubtaskManager
                  subtasks={tempSubtasks}
                  onAdd={addTempSubtask}
                  onRemove={removeTempSubtask}
                  onUpdate={updateTempSubtask}
                  disabled={loading}
                />
              )}
            </div>

            <DialogFooter className="flex justify-between">
              <div>
                {isEditing && isEditMode && !readOnly && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleArchive}
                    disabled={archiveLoading}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    {archiveLoading ? "Arquivando..." : "Arquivar"}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {readOnly || (isEditing && !isEditMode)
                    ? "Fechar"
                    : "Cancelar"}
                </Button>
                {!readOnly && (!isEditing || isEditMode) && (
                  <Button
                    type="submit"
                    disabled={loading}
                    style={{
                      backgroundColor: "#09b230",
                      borderColor: "#09b230",
                    }}
                    className="hover:bg-[#08a02b] hover:border-[#08a02b] transition-colors"
                  >
                    {loading
                      ? "Salvando..."
                      : isEditing
                      ? "Atualizar"
                      : "Criar"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Componente para gerenciar subtarefas temporárias durante a criação
interface TempSubtaskManagerProps {
  subtasks: Array<{ id: string; title: string; description?: string }>;
  onAdd: (title: string, description?: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, title: string, description?: string) => void;
  disabled?: boolean;
}

const TempSubtaskManager: React.FC<TempSubtaskManagerProps> = ({
  subtasks,
  onAdd,
  onRemove,
  onUpdate,
  disabled = false,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const handleAdd = () => {
    if (!newTitle.trim()) return;

    onAdd(newTitle.trim(), newDescription.trim() || undefined);
    setNewTitle("");
    setNewDescription("");
    setShowAddForm(false);
  };

  const handleEdit = (subtask: {
    id: string;
    title: string;
    description?: string;
  }) => {
    setEditingId(subtask.id);
    setEditTitle(subtask.title);
    setEditDescription(subtask.description || "");
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim() || !editingId) return;

    onUpdate(editingId, editTitle.trim(), editDescription.trim() || undefined);
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  };

  return (
    <div className="space-y-3">
      {/* Lista de subtarefas existentes */}
      {subtasks.length > 0 && (
        <div className="space-y-2">
          {subtasks.map((subtask) => (
            <Card key={subtask.id} className="p-3">
              {editingId === subtask.id ? (
                <div className="space-y-2">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Título da subtarefa"
                    className="text-sm"
                  />
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Descrição (opcional)"
                    className="text-sm resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveEdit}
                      style={{
                        backgroundColor: "#09b230",
                        borderColor: "#09b230",
                      }}
                      className="hover:bg-[#08a02b] hover:border-[#08a02b] transition-colors"
                    >
                      Salvar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{subtask.title}</p>
                    {subtask.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {subtask.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(subtask)}
                      disabled={disabled}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(subtask.id)}
                      disabled={disabled}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Formulário para adicionar nova subtarefa */}
      {showAddForm ? (
        <Card className="p-3">
          <div className="space-y-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título da subtarefa"
              className="text-sm"
            />
            <Textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Descrição (opcional)"
              className="text-sm resize-none"
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleAdd}
                disabled={!newTitle.trim() || disabled}
                style={{ backgroundColor: "#09b230", borderColor: "#09b230" }}
                className="hover:bg-[#08a02b] hover:border-[#08a02b] transition-colors"
              >
                <Check className="h-3 w-3 mr-1" />
                Adicionar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setNewTitle("");
                  setNewDescription("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(true)}
          disabled={disabled}
          className="w-full border-dashed"
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar Subtarefa
        </Button>
      )}

      {subtasks.length === 0 && !showAddForm && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Nenhuma subtarefa adicionada
        </div>
      )}
    </div>
  );
};
