import React, { useMemo, useState } from "react";
import { Plus, Trash2, Lock, SortAsc, Clock, CheckSquare } from "lucide-react";
import { usePersonalLists, PersonalList } from "@/hooks/usePersonalLists";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuthFinal";
import { useToast } from "@/hooks/use-toast";
import { Activity } from "@/hooks/useActivities";
import { ActivityCard } from "@/components/activities/ActivityCard";
import { DraggableActivityCard } from "@/components/activities/DraggableActivityCard";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useActivityOperations } from "@/hooks/useActivityOperations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SortOrder = "alphabetical" | "creation" | null;

interface Props {
  onCreateCard: (listId: string) => void;
  onEditCard: (activity: Activity) => void;
  statusFilter?: "pending" | "in_progress" | "completed" | "archived" | null;
  monthStart: Date;
  monthEnd: Date;
}

export const PersonalListsBoard: React.FC<Props> = ({
  onCreateCard,
  onEditCard,
  statusFilter = null,
  monthStart,
  monthEnd,
}) => {
  const { lists, createList, renameList, deleteList } = usePersonalLists();
  const { user } = useAuth();
  const { toast } = useToast();
  const { updateActivity } = useActivityOperations();
  const [activitiesByList, setActivitiesByList] = useState<
    Record<string, Activity[]>
  >({});
  const [loadingLists, setLoadingLists] = useState<Record<string, boolean>>({});
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [manualOrder, setManualOrder] = useState<Record<string, string[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadActivities = React.useCallback(
    async (listId: string) => {
      setLoadingLists((s) => ({ ...s, [listId]: true }));
      try {
        let query = supabase
          .from("activities")
          .select(
            `*, profiles:user_id(full_name, avatar_url), subtasks(id, title, is_completed, checklist_group, order_index, description, activity_id, created_at, updated_at)`
          )
          .eq("list_id", listId)
          .neq("status", "archived");

        // Always filter by month
        query = query
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        const { data, error } = await query.order("created_at", {
          ascending: false,
        });
        if (error) throw error;
        // Order subtasks client-side to ensure stable render
        const normalized = ((data as unknown as Activity[]) || []).map((a) => ({
          ...a,
          subtasks: (a.subtasks || []).slice().sort((x, y) => {
            // First sort by group (ensuring newest groups appear first)
            const groupCompare = (y.checklist_group || "").localeCompare(
              x.checklist_group || ""
            );
            if (groupCompare !== 0) return groupCompare;
            // Then sort by order_index within groups
            return (x.order_index ?? 0) - (y.order_index ?? 0);
          }),
        }));

        // Apply sorting
        let sorted: Activity[] = [...(normalized as Activity[])];
        if (sortOrder === "alphabetical") {
          sorted = sorted.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortOrder === "creation") {
          sorted = sorted.sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );
        } else {
          const order = manualOrder[listId];
          if (order && order.length > 0) {
            // normalized items should match Activity shape; cast to satisfy TS
            sorted = order
              .map((id) => normalized.find((a) => a.id === id))
              .filter(Boolean) as unknown as Activity[];
          } else {
            setManualOrder((prev) => ({
              ...prev,
              [listId]: normalized.map((a) => a.id),
            }));
          }
        }

        setActivitiesByList((s) => ({
          ...s,
          [listId]: sorted,
        }));
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingLists((s) => ({ ...s, [listId]: false }));
      }
    },
    [sortOrder, manualOrder, monthStart, monthEnd]
  );

  const listIds = React.useMemo(
    () => lists.map((l) => l.id).join(","),
    [lists]
  );

  React.useEffect(() => {
    const loadAllActivities = async () => {
      const results: Record<string, Activity[]> = {};

      // Carregar todas as listas em paralelo
      await Promise.all(
        lists.map(async (list) => {
          try {
            const query = supabase
              .from("activities")
              .select(
                `*, profiles:user_id(full_name, avatar_url), subtasks(id, title, is_completed, checklist_group, order_index, description, activity_id, created_at, updated_at)`
              )
              .eq("list_id", list.id)
              .neq("status", "archived")
              .gte("created_at", monthStart.toISOString())
              .lte("created_at", monthEnd.toISOString())
              .order("created_at", { ascending: false });

            const { data, error } = await query;

            if (error) throw error;
            if (data) {
              // Order subtasks client-side to ensure stable render
              const normalized = (data as unknown as Activity[]).map((a) => ({
                ...a,
                subtasks: (a.subtasks || []).slice().sort((x, y) => {
                  const groupCompare = (y.checklist_group || "").localeCompare(
                    x.checklist_group || ""
                  );
                  if (groupCompare !== 0) return groupCompare;
                  return (x.order_index ?? 0) - (y.order_index ?? 0);
                }),
              }));

              results[list.id] = normalized;
            }
          } catch (err) {
            console.error("Erro ao carregar lista:", err);
          }
        })
      );

      // Atualizar estado uma única vez com todos os resultados
      setActivitiesByList(results);
    };

    loadAllActivities();

    // Single realtime channel scoped to the user's personal list activities
    // Triggers on create/update/delete and we filter in the handler to avoid missing events
    const channel = supabase
      .channel(`personal_list_activities_user_${user?.id || "anon"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activities",
        },
        (payload) => {
          const newRow = payload.new as {
            list_id?: string;
            created_by?: string;
          } | null;
          const oldRow = payload.old as {
            list_id?: string;
            created_by?: string;
          } | null;
          const listId = newRow?.list_id ?? oldRow?.list_id;
          const createdBy = newRow?.created_by ?? oldRow?.created_by;
          if (!listId) return;
          // Only react to rows belonging to current user when possible
          if (createdBy && user?.id && createdBy !== user.id) return;
          // Reload only the impacted list
          loadActivities(listId);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subtasks",
        },
        () => {
          // Reload all lists when subtasks change
          lists.forEach((l) => loadActivities(l.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // Não incluir activitiesByList nas dependências para evitar loop infinito de carregamento
  }, [user?.id, listIds, lists, loadActivities, monthStart, monthEnd]);

  // Listen for explicit refresh events to make updates feel instant
  React.useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ listId?: string }>;
      const listId = custom.detail?.listId;
      if (listId) {
        loadActivities(listId);
      } else {
        lists.forEach((l) => loadActivities(l.id));
      }
    };
    const forceHandler = (e: Event) => {
      const custom = e as CustomEvent<{ listId?: string }>;
      const listId = custom.detail?.listId;
      if (listId) {
        // Reload imediato e com delay para garantir
        loadActivities(listId);
        setTimeout(() => loadActivities(listId), 100);
      }
    };
    window.addEventListener("personal-list-updated", handler as EventListener);
    window.addEventListener(
      "personal-list-force-reload",
      forceHandler as EventListener
    );
    return () => {
      window.removeEventListener(
        "personal-list-updated",
        handler as EventListener
      );
      window.removeEventListener(
        "personal-list-force-reload",
        forceHandler as EventListener
      );
    };
  }, [lists, loadActivities]);

  const handleAddList = async () => {
    setNewListOpen(true);
  };

  const confirmCreateList = async () => {
    const name = newListName.trim();
    if (!name) return;
    const created = await createList(name);
    if (created) {
      toast({ title: "Lista criada" });
      setNewListName("");
      setNewListOpen(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Corrigir uso de useDroppable: criar refs antes do render
  // Child component so hooks (useDroppable) are called at top-level
  const DroppableList: React.FC<{
    list: PersonalList;
    items: Activity[];
  }> = ({ list, items }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `list-${list.id}`,
      data: { type: "personal-list-droppable" },
    });
    return (
      <div className="relative">
        {/* Drop zone overlay */}
        <div
          ref={setNodeRef}
          className={`absolute inset-0 z-10 rounded-xl transition-all ${
            isOver
              ? "bg-blue-100/50 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-500"
              : "pointer-events-none"
          }`}
        />

        <div className="bg-gray-100 dark:bg-[#1f1f1f] rounded-xl p-3 min-h-[120px] border border-gray-200 dark:border-gray-700 flex flex-col relative w-80 flex-shrink-0">
          <div className="flex flex-col gap-1 mb-2 px-1">
            <div className="flex items-center justify-between">
              <button
                className="font-semibold text-sm text-gray-800 dark:text-gray-200 text-left hover:underline"
                onClick={() => {
                  setSelectedListId(list.id);
                  setRenameName(list.name);
                  setRenameOpen(true);
                }}
              >
                {list.name}
              </button>
              <button
                className="text-gray-700 dark:text-gray-300 hover:text-red-500"
                onClick={() => {
                  setSelectedListId(list.id);
                  setDeleteOpen(true);
                }}
                title="Excluir quadro"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {items.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                <CheckSquare className="h-3 w-3" />
                <span>
                  {items.reduce(
                    (acc, activity) =>
                      acc +
                      (activity.subtasks?.filter((t) => t.is_completed)
                        ?.length || 0),
                    0
                  )}
                  /
                  {items.reduce(
                    (acc, activity) => acc + (activity.subtasks?.length || 0),
                    0
                  )}
                </span>
              </div>
            )}
          </div>

          <SortableContext
            items={items.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pr-1 max-h-[65vh] lg:max-h-[70vh]">
              {items.map((a) => (
                <DraggableActivityCard
                  key={a.id}
                  activity={a}
                  onEdit={onEditCard}
                />
              ))}

              <button
                className="mt-1 p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-150 flex items-center gap-2 text-sm"
                onClick={() => onCreateCard(list.id)}
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar um cartão</span>
              </button>
            </div>
          </SortableContext>
        </div>
      </div>
    );
  };
  const handleDragOver = (_event: DragOverEvent) => {
    // Apenas feedback visual
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Movimento entre quadros privados
    if (overId.startsWith("list-")) {
      const newListId = overId.replace("list-", "");
      const currentActivity = Object.values(activitiesByList)
        .flat()
        .find((a) => a.id === activeId);
      if (currentActivity && currentActivity.list_id !== newListId) {
        // Optimistic UI: move locally first to avoid duplication
        const srcListId = currentActivity.list_id;
        setActivitiesByList((prev) => {
          const next: Record<string, Activity[]> = { ...prev };
          next[srcListId] = (next[srcListId] || []).filter(
            (a) => a.id !== activeId
          );
          // ensure destination has no duplicate of this activity
          const destWithout = (next[newListId] || []).filter(
            (a) => a.id !== activeId
          );
          const candidate = {
            ...currentActivity,
            list_id: newListId,
          } as Activity;
          next[newListId] = [candidate, ...destWithout];
          return next;
        });

        // Update manual order optimistically
        setManualOrder((prev) => {
          const next = { ...prev };
          next[srcListId] = (next[srcListId] || []).filter(
            (id) => id !== activeId
          );
          next[newListId] = [
            activeId,
            ...(next[newListId] || []).filter((id) => id !== activeId),
          ];
          return next;
        });

        // Persist change and then reload authoritative state to avoid duplication
        updateActivity({ id: activeId, list_id: newListId })
          .then(() => {
            // Force-reload both source and destination lists so client state matches server
            loadActivities(srcListId);
            loadActivities(newListId);

            // Also dispatch a light update event for other listeners
            window.dispatchEvent(
              new CustomEvent("personal-list-updated", {
                detail: { listId: newListId },
              })
            );

            // And a forced reload event as a fallback for any listeners that need it
            window.dispatchEvent(
              new CustomEvent("personal-list-force-reload", {
                detail: { listId: newListId },
              })
            );
          })
          .catch((err) => {
            console.error("Failed to move activity:", err);
            // Re-fetch both lists to restore consistent state
            loadActivities(srcListId);
            loadActivities(newListId);
          });
      }
      return;
    }

    // Reordenação dentro do mesmo quadro (manual)
    if (sortOrder === null) {
      let sourceListId = "";
      for (const [listId, activities] of Object.entries(activitiesByList)) {
        if (activities.some((a) => a.id === activeId)) {
          sourceListId = listId;
          break;
        }
      }
      if (!sourceListId) return;
      const currentOrder = manualOrder[sourceListId] || [];
      const oldIndex = currentOrder.indexOf(activeId);
      const newIndex = currentOrder.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = [...currentOrder];
        newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, activeId);
        setManualOrder((prev) => ({ ...prev, [sourceListId]: newOrder }));
      }
    }
  };

  const activeActivity = activeId
    ? Object.values(activitiesByList)
        .flat()
        .find((a) => a.id === activeId)
    : null;

  // Filtrar listas pelo mês de criação
  const filteredLists = useMemo(() => {
    return lists.filter((list) => {
      const created = new Date(list.created_at);
      return created >= monthStart && created <= monthEnd;
    });
  }, [lists, monthStart, monthEnd]);

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <Lock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Seus quadros privados
        </h2>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={sortOrder === "alphabetical" ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setSortOrder(sortOrder === "alphabetical" ? null : "alphabetical")
          }
          className="h-8 w-8 p-0"
          title="Ordem alfabética"
        >
          <SortAsc className="h-4 w-4" />
        </Button>
        <Button
          variant={sortOrder === "creation" ? "default" : "outline"}
          size="sm"
          onClick={() =>
            setSortOrder(sortOrder === "creation" ? null : "creation")
          }
          className="h-8 w-8 p-0"
          title="Ordem de criação"
        >
          <Clock className="h-4 w-4" />
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-0 custom-scrollbar">
          {filteredLists.map((list) => {
            const all = activitiesByList[list.id] || [];
            const items = statusFilter
              ? all.filter((a) => a.status === statusFilter)
              : all;
            if (statusFilter && items.length === 0) return null;
            return <DroppableList key={list.id} list={list} items={items} />;
          })}

          {/* Botão para adicionar nova lista */}
          <div className="w-80 flex-shrink-0 bg-gray-50 dark:bg-[#0f0f0f] rounded-xl p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center min-h-[120px]">
            <button
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center gap-2 text-sm font-medium"
              onClick={handleAddList}
            >
              <Plus className="h-5 w-5" />
              <span>Adicionar quadro</span>
            </button>
          </div>
        </div>

        <DragOverlay
          dropAnimation={null}
          adjustScale={false}
          style={{
            transformOrigin: "0 0",
          }}
        >
          {activeActivity ? (
            <div className="bg-white dark:bg-[#161616] rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 opacity-90 w-[280px] rotate-2 pointer-events-none">
              <ActivityCard activity={activeActivity} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Dialog para criar nova lista */}
      <Dialog open={newListOpen} onOpenChange={setNewListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar novo quadro</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome do quadro"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmCreateList();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewListOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmCreateList}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para renomear lista */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear quadro</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nome do quadro"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const name = renameName.trim();
                if (name && selectedListId) {
                  renameList(selectedListId, name);
                  setRenameOpen(false);
                }
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const name = renameName.trim();
                if (name && selectedListId) {
                  renameList(selectedListId, name);
                  setRenameOpen(false);
                }
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar exclusão */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir quadro</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tem certeza que deseja excluir este quadro? Esta ação não pode ser
            desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedListId) {
                  deleteList(selectedListId);
                  setDeleteOpen(false);
                }
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
