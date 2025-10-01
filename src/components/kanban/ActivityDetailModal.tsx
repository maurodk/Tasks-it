import { Activity } from "@/hooks/useActivities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  User,
  FileText,
  Target,
  Building2,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseUnified";
import { useAuth } from "@/hooks/useAuth";

interface Checklist {
  id: string;
  text: string;
  completed: boolean;
}

interface ActivityDetailModalProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function ActivityDetailModal({
  activity,
  open,
  onOpenChange,
  onUpdate,
}: ActivityDetailModalProps) {
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  
  // Form states  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Initialize form when activity changes
  useEffect(() => {
    if (activity) {
      setTitle(activity.title);
      setDescription(activity.description || "");
      setStatus(activity.status);
      setPriority(activity.priority || "medium");
      setDueDate(activity.due_date ? activity.due_date.split('T')[0] : "");
      
      // Load existing checklists (from description for now)
      setChecklists([]);
    }
  }, [activity]);

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (!activity || !title.trim()) return;

    try {
      const { error } = await supabase
        .from("activities")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          status: status as "pending" | "in_progress" | "completed",
          priority: priority as "low" | "medium" | "high",
          due_date: dueDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activity.id);

      if (error) throw error;
      
      toast.success("Alterações salvas automaticamente!");
    } catch (error) {
      console.error("Auto-save error:", error);
      toast.error("Erro ao salvar alterações");
    }
  }, [activity, title, description, status, priority, dueDate]);

  // Auto-save on close
  const handleClose = useCallback(async () => {
    if (activity) {
      await autoSave();
      onUpdate?.();
    }
    onOpenChange(false);
  }, [autoSave, onUpdate, onOpenChange, activity]);

  // Checklist functions
  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    
    const newItem: Checklist = {
      id: Date.now().toString(),
      text: newChecklistItem.trim(),
      completed: false,
    };
    
    setChecklists([...checklists, newItem]);
    setNewChecklistItem("");
  };

  const toggleChecklistItem = (id: string) => {
    setChecklists(checklists.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const removeChecklistItem = (id: string) => {
    setChecklists(checklists.filter(item => item.id !== id));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (!activity) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes da Atividade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título da atividade"
              className="font-medium"
            />
          </div>

          {/* Status e Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data de Vencimento */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Data de Vencimento</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Digite a descrição da atividade"
              className="min-h-[100px]"
            />
          </div>

          <Separator />

          {/* Checklist */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              <Label className="text-base font-medium">Checklist</Label>
            </div>

            {/* Lista de itens */}
            <div className="space-y-2">
              {checklists.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded border">
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => toggleChecklistItem(item.id)}
                  />
                  <span className={`flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {item.text}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeChecklistItem(item.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Adicionar novo item */}
            <div className="flex gap-2">
              <Input
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                placeholder="Adicionar item à checklist"
                onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
              />
              <Button
                onClick={addChecklistItem}
                size="sm"
                className="px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Informações da Atividade */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Responsável:</span>
              <span className="font-medium">{activity.profiles?.full_name || "Não atribuído"}</span>
            </div>

            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Setor:</span>
              <span className="font-medium">{activity.sector_id || "N/A"}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Criado em:</span>
              <span className="font-medium">
                {format(new Date(activity.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>

            {activity.due_date && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Vencimento:</span>
                <span className="font-medium">
                  {format(new Date(activity.due_date), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            )}
          </div>

          {/* Badges de Status */}
          <div className="flex gap-2">
            <Badge className={getPriorityColor(activity.priority || "medium")}>
              {activity.priority === "high" ? "Alta Prioridade" : 
               activity.priority === "medium" ? "Média Prioridade" : "Baixa Prioridade"}
            </Badge>
            <Badge className={getStatusColor(activity.status)}>
              {activity.status === "completed" ? "Concluída" :
               activity.status === "in_progress" ? "Em Progresso" : "Pendente"}
            </Badge>
          </div>
        </div>

        {/* Footer com informação de salvamento automático */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            💾 As alterações são salvas automaticamente ao fechar o modal
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
