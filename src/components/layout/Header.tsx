import { Search, Clock } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/UserMenu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SearchDropdown } from "@/components/layout/SearchDropdown";
import { ActivityEditModal } from "@/components/activities/ActivityEditModal";
import { ActivityHistoryModal } from "@/components/activities/ActivityHistoryModal";
import { useActivitySearch, SearchActivity } from "@/hooks/useActivitySearch";
import {
  useOptimizedActivities,
  Activity,
} from "@/hooks/useOptimizedActivities";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { Database } from "@/types/supabase";
import { useActivityOperations } from "@/hooks/useActivityOperations";
import {
  requestWakeLock,
  releaseWakeLock,
  isWakeLockActive,
} from "@/lib/wakeLock";

export const Header = () => {
  const {
    searchResults,
    isSearching,
    searchQuery,
    updateSearchQuery,
    clearSearch,
  } = useActivitySearch();
  const { refetch } = useOptimizedActivities();
  const { toast } = useToast();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { updateActivity, archiveActivity } = useActivityOperations();
  const [wakeLockOn, setWakeLockOn] = useState(isWakeLockActive());

  useEffect(() => {
    // Re-acquire wake lock after returning to the tab if user enabled it
    const handler = async () => {
      if (wakeLockOn && !isWakeLockActive()) {
        await requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [wakeLockOn]);

  // Extend SearchActivity at call site to include optional list_id without using any
  type SearchActivityWithList = SearchActivity & { list_id?: string | null };
  const handleActivitySelect = async (activity: SearchActivityWithList) => {
    // Converter SearchActivity para Activity completa
    const fullActivity: Activity = {
      id: activity.id,
      title: activity.title,
      description: activity.description || "",
      status: activity.status as Database["public"]["Enums"]["activity_status"],
      priority:
        activity.priority as Database["public"]["Enums"]["activity_priority"],
      due_date: activity.due_date,
      user_id: activity.user_id,
      created_by: activity.created_by,
      sector_id: activity.sector_id,
      list_id: activity.list_id ?? null,
      subsector_id: activity.subsector_id,
      created_at: activity.created_at,
      updated_at: activity.updated_at,
      completed_at: activity.completed_at,
      estimated_time: activity.estimated_time,
      is_private:
        (activity as unknown as { is_private?: boolean }).is_private ?? false,
      profiles: activity.profiles,
      subsectors: activity.subsectors,
      subtasks: [],
    };

    setSelectedActivity(fullActivity);
    setActivityModalOpen(true);
    clearSearch();
    setIsSearchFocused(false);
  };

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 border-b border-border/60 bg-card/40 dark:bg-[#1f1f1f]/80 backdrop-blur-md flex items-center justify-between px-6 z-50 relative">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors" />
        <div className="relative max-w-md z-[60]" ref={searchContainerRef}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar atividades..."
            value={searchQuery}
            onChange={(e) => updateSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            className="dark:bg-[#0f0f0f] pl-10 w-80 bg-background/60 backdrop-blur-sm border-border/50 placeholder:text-muted-foreground/70 hover:border-border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#09b230]/20 focus-visible:ring-offset-0 focus-visible:border-[#09b230]/70"
          />
          {(isSearchFocused || searchQuery) && (
            <SearchDropdown
              results={searchResults}
              isSearching={isSearching}
              searchQuery={searchQuery}
              onClearSearch={() => {
                clearSearch();
                setIsSearchFocused(false);
              }}
              onSelectActivity={handleActivitySelect}
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setHistoryModalOpen(true)}
          className="h-8 w-8 p-0 transition-colors relative mr-4"
          title="Histórico de Atividades"
        >
          <Clock className="h-4 w-4 text-muted-foreground hover:text-foreground dark:text-white transition-colors" />
        </Button>
        <UserMenu />
      </div>

      {activityModalOpen && (
        <ActivityEditModal
          activity={selectedActivity}
          isOpen={activityModalOpen}
          onClose={() => {
            setActivityModalOpen(false);
            setSelectedActivity(null);
          }}
          onSave={async (partial) => {
            if (!selectedActivity) return;
            type Priority = Activity["priority"];
            type Status = Activity["status"];
            await updateActivity({
              id: selectedActivity.id,
              title: partial.title,
              description: partial.description,
              due_date: partial.due_date as string | undefined,
              priority: partial.priority as Priority | undefined,
              status: partial.status as Status | undefined,
              user_id: partial.user_id,
              is_private: (partial as unknown as { is_private?: boolean })
                .is_private,
            });
            await refetch();
            setActivityModalOpen(false);
            setSelectedActivity(null);
          }}
          onDelete={async (id) => {
            await archiveActivity(id);
            await refetch();
            setActivityModalOpen(false);
            setSelectedActivity(null);
          }}
        />
      )}

      <ActivityHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        title="Histórico Geral de Atividades"
      />
    </header>
  );
};
