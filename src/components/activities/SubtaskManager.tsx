import React, { useState } from "react";
import { Plus, X, GripVertical, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSubtasks } from "@/hooks/useSubtasks";
import { Subtask } from "@/hooks/useActivities";

interface SubtaskManagerProps {
  activityId: string;
  subtasks: Subtask[];
  onSubtasksChange: () => void;
  disabled?: boolean;
}

export const SubtaskManager: React.FC<SubtaskManagerProps> = ({
  activityId,
  subtasks,
  onSubtasksChange,
  disabled = false,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const { loading, addSubtask, updateSubtask, deleteSubtask } = useSubtasks();

  const sortedSubtasks = [...subtasks].sort(
    (a, b) => a.order_index - b.order_index
  );

  const handleAddSubtask = async () => {
    if (!newTitle.trim()) return;

    const success = await addSubtask(
      activityId,
      newTitle.trim(),
      newDescription.trim() || undefined
    );
    if (success) {
      setNewTitle("");
      setNewDescription("");
      setShowAddForm(false);
      onSubtasksChange();
    }
  };

  const handleToggleComplete = async (subtask: Subtask) => {
    const success = await updateSubtask(subtask.id, {
      is_completed: !subtask.is_completed,
    });
    if (success) {
      onSubtasksChange();
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const success = await deleteSubtask(subtaskId);
    if (success) {
      onSubtasksChange();
    }
  };

  const completedCount = subtasks.filter((st) => st.is_completed).length;
  const totalCount = subtasks.length;
  const progressPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Subtarefas</h4>
          {totalCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {completedCount} de {totalCount} concluídas ({progressPercentage}
              %)
            </p>
          )}
        </div>
        {!disabled && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm || loading}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        )}
      </div>

      {totalCount > 0 && (
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-[#09b230] h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}

      {showAddForm && (
        <Card className="border-dashed border-[#09b230]/30">
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Título da subtarefa"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="focus:border-[#09b230] focus:ring-[#09b230]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
            />
            <Textarea
              placeholder="Descrição (opcional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="resize-none h-20 focus:border-[#09b230] focus:ring-[#09b230]"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddSubtask}
                disabled={!newTitle.trim() || loading}
                style={{ backgroundColor: "#09b230", borderColor: "#09b230" }}
                className="hover:bg-[#08a02b] hover:border-[#08a02b]"
              >
                <Check className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewTitle("");
                  setNewDescription("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sortedSubtasks.length > 0 && (
        <div className="space-y-2">
          {sortedSubtasks.map((subtask) => (
            <div
              key={subtask.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                subtask.is_completed
                  ? "bg-muted/50 border-muted"
                  : "bg-background border-border hover:border-[#09b230]/30"
              }`}
            >
              <div className="flex items-center gap-2 flex-1">
                <Checkbox
                  checked={subtask.is_completed}
                  onCheckedChange={() => handleToggleComplete(subtask)}
                  disabled={disabled || loading}
                  className="data-[state=checked]:bg-[#09b230] data-[state=checked]:border-[#09b230]"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      subtask.is_completed
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {subtask.title}
                  </p>
                  {subtask.description && (
                    <p
                      className={`text-xs mt-1 ${
                        subtask.is_completed
                          ? "line-through text-muted-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {subtask.description}
                    </p>
                  )}
                </div>
              </div>

              {!disabled && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                    disabled={loading}
                  >
                    <GripVertical className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-50 hover:opacity-100 hover:text-destructive"
                    onClick={() => handleDeleteSubtask(subtask.id)}
                    disabled={loading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {sortedSubtasks.length === 0 && !showAddForm && (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">Nenhuma subtarefa adicionada ainda.</p>
          {!disabled && (
            <p className="text-xs mt-1">
              Clique em "Adicionar" para criar sua primeira subtarefa.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
