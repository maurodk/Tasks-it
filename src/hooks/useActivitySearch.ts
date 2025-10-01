import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Database } from "@/types/supabase";

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];
type ProfileData = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "avatar_url"
>;
type SubsectorData = Pick<
  Database["public"]["Tables"]["subsectors"]["Row"],
  "name"
>;

export type SearchActivity = ActivityRow & {
  profiles?: ProfileData | null;
  subsectors?: SubsectorData | null;
};

export function useActivitySearch() {
  const [searchResults, setSearchResults] = useState<SearchActivity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { profile } = useAuth();

  const searchActivities = useCallback(
    async (query: string) => {
      if (!query.trim() || !profile) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);

      try {
        let searchQuery = supabase
          .from("activities")
          .select(
            `
            *,
            profiles (
              full_name,
              avatar_url
            ),
            subsectors (
              name
            )
          `
          )
          .neq("status", "archived")
          .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

        // Aplicar filtros baseados no papel do usuário
        if (profile.role === "manager") {
          // Gestores podem buscar em todas as atividades do setor
          searchQuery = searchQuery.eq("sector_id", profile.sector_id);
        } else {
          // Colaboradores podem buscar apenas no seu subsetor
          searchQuery = searchQuery.eq("subsector_id", profile.subsector_id);
        }

        const { data, error } = await searchQuery
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        setSearchResults((data as unknown as SearchActivity[]) || []);
      } catch (error) {
        console.error("Erro na busca:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [profile]
  );

  // Debounce para evitar muitas requisições
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchActivities(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchActivities]);

  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  return {
    searchResults,
    isSearching,
    searchQuery,
    updateSearchQuery,
    clearSearch,
  };
}
