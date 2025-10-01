import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Check, X, Pencil } from "lucide-react";
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
  const [explicitGroups, setExplicitGroups] = useState<string[]>([]);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [groupDraftName, setGroupDraftName] = useState<string>("");

  // Agrupar e ordenar subtasks por grupo
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

  // Sort tasks within each group by order_index
  Object.keys(groupedSubtasks).forEach((groupName) => {
    groupedSubtasks[groupName].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );
  });

  // Union of explicit groups and groups present on subtasks
  // NOTE: do NOT include the default 'Checklist' automatically — only show groups
  // that come from existing subtasks or were explicitly created by the user.
  // Order groups with explicitGroups first (newest to oldest), then other groups
  const allGroupNames = Array.from(
    new Set([...explicitGroups.reverse(), ...Object.keys(groupedSubtasks)])
  ).filter((name) => name !== "Checklist" || groupedSubtasks["Checklist"]);

  const handleAddGroup = () => {
    const group = newGroupName.trim();
    if (!group) return;
    // Add new group at the beginning of the array
    setExplicitGroups((prev) =>
      prev.includes(group) ? prev : [group, ...prev]
    );
    setSelectedGroup(group);
    setNewTaskTitle("");
    setNewGroupName("");
    setIsAddingGroup(false);
  };

  const handleAddTask = (groupName: string) => {
    if (!newTaskTitle.trim()) return;

    // Get current tasks in the group
    const groupTasks = groupedSubtasks[groupName] || [];

    // Find the smallest order_index in the group (for new task to be at top)
    const minOrderIndex =
      groupTasks.length > 0
        ? Math.min(...groupTasks.map((t) => t.order_index ?? 0)) - 1
        : 0;

    const newSubtask: Subtask = {
      id: `temp-${Date.now()}`,
      title: newTaskTitle.trim(),
      is_completed: false,
      activity_id: "",
      description: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      order_index: minOrderIndex,
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
    setExplicitGroups((prev) => prev.filter((g) => g !== groupName));
  };

  const startRenameGroup = (groupName: string) => {
    setEditingGroup(groupName);
    setGroupDraftName(groupName);
  };

  const confirmRenameGroup = () => {
    const oldName = editingGroup;
    const newName = groupDraftName.trim();
    if (!oldName || !newName) {
      // if blank, just cancel
      setEditingGroup(null);
      setGroupDraftName("");
      return;
    }
    // Update all tasks in this group
    const updated = subtasks.map((t) => {
      const currentGroup = t.checklist_group || "Checklist";
      if (currentGroup === oldName) {
        return { ...t, checklist_group: newName };
      }
      return t;
    });
    onSubtasksChange(updated);
    // Update explicit groups if present
    setExplicitGroups((prev) => {
      if (!prev.includes(oldName)) return prev;
      return prev.map((g) => (g === oldName ? newName : g));
    });
    setEditingGroup(null);
    setGroupDraftName("");
  };

  const cancelRenameGroup = () => {
    setEditingGroup(null);
    setGroupDraftName("");
  };

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
        {allGroupNames.map((groupName) => {
          const tasks = groupedSubtasks[groupName] || [];
          const validTasks = tasks.filter((t) => t.title.trim());
          const completedTasks = validTasks.filter(
            (t) => t.is_completed
          ).length;
          const totalTasks = validTasks.length;
          const progress =
            totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

          return (
            <Card
              key={groupName}
              className="border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    {editingGroup === groupName ? (
                      <div className="flex items-center gap-2 w-full">
                        <Input
                          value={groupDraftName}
                          onChange={(e) => setGroupDraftName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmRenameGroup();
                            if (e.key === "Escape") cancelRenameGroup();
                          }}
                          className="h-7 text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          className="h-7 px-2"
                          onClick={confirmRenameGroup}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2"
                          onClick={cancelRenameGroup}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <CardTitle className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {groupName}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {completedTasks}/{totalTasks}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startRenameGroup(groupName)}
                          className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                          title="Renomear grupo"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </>
                    )}
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
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
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
                  <div
                    key={task.id}
                    className="flex items-center gap-2 group bg-white/70 dark:bg-gray-900/60 rounded-md px-2 py-1.5 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
                  >
                    <Checkbox
                      checked={task.is_completed}
                      onCheckedChange={() => handleToggleTask(task.id)}
                    />
                    <Input
                      value={task.title}
                      onChange={(e) =>
                        handleUpdateTaskTitle(task.id, e.target.value)
                      }
                      onPaste={(e) => {
                        const text = e.clipboardData.getData("text");
                        if (text.includes("\n")) {
                          e.preventDefault();
                          const lines = text
                            .split(/\r?\n/)
                            .map((l) => l.trim())
                            .filter(Boolean);
                          if (lines.length) {
                            const updated = subtasks
                              .filter((t) => t.id !== task.id)
                              .concat(
                                lines.map((line, idx) => ({
                                  id: `temp-${Date.now()}-${idx}`,
                                  title: line,
                                  is_completed: false,
                                  activity_id: "",
                                  description: null,
                                  created_at: new Date().toISOString(),
                                  updated_at: new Date().toISOString(),
                                  order_index: subtasks.length + idx,
                                  checklist_group:
                                    task.checklist_group || "Checklist",
                                }))
                              );
                            onSubtasksChange(updated);
                          }
                        }
                      }}
                      className={`flex-1 border bg-white/80 dark:bg-gray-900/70 px-2 py-1 rounded-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
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
                        e.preventDefault();
                        handleAddTask(groupName);
                      }
                    }}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData("text");
                      if (text.includes("\n")) {
                        e.preventDefault();
                        const lines = text
                          .split(/\r?\n/)
                          .map((l) => l.trim())
                          .filter(Boolean);
                        if (lines.length) {
                          const newItems = lines.map(
                            (line, idx) =>
                              ({
                                id: `temp-${Date.now()}-${idx}`,
                                title: line,
                                is_completed: false,
                                activity_id: "",
                                description: null,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                                order_index: subtasks.length + idx,
                                checklist_group: groupName,
                              } as Subtask)
                          );
                          onSubtasksChange([...subtasks, ...newItems]);
                          setNewTaskTitle("");
                        }
                      }
                    }}
                    className="text-sm border bg-white/80 dark:bg-gray-900/70 px-2 py-1 rounded-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
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

      {/* Removido botão duplicado de criar primeira checklist */}
    </div>
  );
};
