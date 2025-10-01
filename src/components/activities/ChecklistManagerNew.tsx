import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Check, X } from "lucide-react";
import { Subtask } from "@/hooks/useActivities";

interface ChecklistManagerProps {
  subtasks: Subtask[];
  onSubtasksChange: (subtasks: Subtask[]) => void;
}

export const ChecklistManager: React.FC<ChecklistManagerProps> = ({
  subtasks,
  onSubtasksChange,
}) => {
  const [newGroupName, setNewGroupName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isAddingGroup, setIsAddingGroup] = useState(false);

  // Agrupar subtasks por grupo
  const groupedSubtasks = subtasks.reduce(
    (groups: { [key: string]: Subtask[] }, subtask) => {
      const groupName = subtask.checklist_group || "Checklist";
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(subtask);
      return groups;
    },
    {}
  );

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;

    // Criar primeiro item do grupo automaticamente
    const newSubtask: Subtask = {
      id: `temp-${Date.now()}`,
      title: "Item exemplo",
      is_completed: false,
      activity_id: "",
      created_at: new Date().toISOString(),
      order_index: subtasks.length,
      checklist_group: newGroupName.trim(),
    };

    onSubtasksChange([...subtasks, newSubtask]);
    setSelectedGroup(newGroupName.trim());
    setNewGroupName("");
    setIsAddingGroup(false);
  };

  const handleAddTask = (groupName: string) => {
    if (!newTaskTitle.trim()) return;

    const newSubtask: Subtask = {
      id: `temp-${Date.now()}`,
      title: newTaskTitle.trim(),
      is_completed: false,
      activity_id: "",
      created_at: new Date().toISOString(),
      order_index: subtasks.length,
      checklist_group: groupName,
    };

    onSubtasksChange([...subtasks, newSubtask]);
    setNewTaskTitle("");
    setSelectedGroup(null);
  };

  const handleToggleTask = (taskId: string) => {
    console.log("Toggling task:", taskId);
    const updatedSubtasks = subtasks.map((task) =>
      task.id === taskId ? { ...task, is_completed: !task.is_completed } : task
    );
    console.log("Updated subtasks:", updatedSubtasks);
    onSubtasksChange(updatedSubtasks);
  };

  const handleUpdateTaskTitle = (taskId: string, newTitle: string) => {
    const updatedSubtasks = subtasks.map((task) =>
      task.id === taskId ? { ...task, title: newTitle } : task
    );
    onSubtasksChange(updatedSubtasks);
  };

  const handleDeleteTask = (taskId: string) => {
    console.log("Deleting task:", taskId);
    const updatedSubtasks = subtasks.filter((task) => task.id !== taskId);
    onSubtasksChange(updatedSubtasks);
  };

  const handleDeleteGroup = (groupName: string) => {
    console.log("Deleting group:", groupName);
    const updatedSubtasks = subtasks.filter(
      (task) => (task.checklist_group || "Checklist") !== groupName
    );
    onSubtasksChange(updatedSubtasks);
  };

  console.log("Current subtasks:", subtasks);
  console.log("Grouped subtasks:", groupedSubtasks);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Checklists
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddingGroup(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Grupo
        </Button>
      </div>

      {/* Adicionar novo grupo */}
      {isAddingGroup && (
        <Card className="border-dashed border-2">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nome do grupo (ex: Cidades, Documentos...)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddGroup()}
                autoFocus
              />
              <Button size="sm" onClick={handleAddGroup}>
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAddingGroup(false);
                  setNewGroupName("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grupos de checklist */}
      <div className="space-y-3">
        {Object.entries(groupedSubtasks).map(([groupName, tasks]) => {
          const completedTasks = tasks.filter((t) => t.is_completed).length;
          const totalTasks = tasks.length;
          const progress =
            totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

          return (
            <Card
              key={groupName}
              className="border border-gray-200 dark:border-gray-700"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {groupName}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {completedTasks}/{totalTasks}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteGroup(groupName)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      completedTasks === totalTasks
                        ? "bg-green-500"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                {/* Lista de tarefas */}
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 group">
                    <Checkbox
                      checked={task.is_completed}
                      onCheckedChange={() => handleToggleTask(task.id)}
                    />
                    <Input
                      value={task.title}
                      onChange={(e) =>
                        handleUpdateTaskTitle(task.id, e.target.value)
                      }
                      className={`flex-1 border-none p-0 h-auto focus-visible:ring-0 ${
                        task.is_completed ? "line-through text-gray-500" : ""
                      }`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                {/* Adicionar nova tarefa */}
                <div className="flex items-center gap-2 pt-2">
                  <Input
                    placeholder="Adicionar item..."
                    value={selectedGroup === groupName ? newTaskTitle : ""}
                    onChange={(e) => {
                      setNewTaskTitle(e.target.value);
                      setSelectedGroup(groupName);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddTask(groupName);
                      }
                    }}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAddTask(groupName)}
                    disabled={
                      !newTaskTitle.trim() || selectedGroup !== groupName
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Adicionar primeiro grupo se não existir nenhum */}
      {Object.keys(groupedSubtasks).length === 0 && !isAddingGroup && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="mb-4">Nenhuma checklist criada ainda.</p>
          <Button
            variant="outline"
            onClick={() => setIsAddingGroup(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Criar primeira checklist
          </Button>
        </div>
      )}
    </div>
  );
};
