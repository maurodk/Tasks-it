import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuthFinal";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/types/supabase";

export type PersonalList =
  Database["public"]["Tables"]["personal_lists"]["Row"];

export function usePersonalLists() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [lists, setLists] = useState<PersonalList[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLists = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("personal_lists")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setLists((data as unknown as PersonalList[]) || []);
    } catch (err) {
      console.error("Erro ao carregar listas pessoais:", err);
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const createList = useCallback(
    async (name: string) => {
      if (!user?.id || !profile?.sector_id) return null;
      try {
        const payload: Database["public"]["Tables"]["personal_lists"]["Insert"] =
          {
            user_id: user.id,
            sector_id: profile.sector_id,
            name,
          };
        const { data, error } = await supabase
          .from("personal_lists")
          .insert(payload)
          .select("*")
          .single();
        if (error) throw error;
        await fetchLists();
        return data as unknown as PersonalList;
      } catch (err) {
        toast({
          title: "Erro ao criar lista",
          description: "Não foi possível criar a lista pessoal.",
          variant: "destructive",
        });
        return null;
      }
    },
    [user?.id, profile?.sector_id, fetchLists, toast]
  );

  const renameList = useCallback(
    async (id: string, name: string) => {
      try {
        const { error } = await supabase
          .from("personal_lists")
          .update({ name })
          .eq("id", id);
        if (error) throw error;
        await fetchLists();
        return true;
      } catch (err) {
        toast({
          title: "Erro ao renomear lista",
          description: "Não foi possível renomear a lista.",
          variant: "destructive",
        });
        return false;
      }
    },
    [fetchLists, toast]
  );

  const deleteList = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase
          .from("personal_lists")
          .delete()
          .eq("id", id);
        if (error) throw error;
        await fetchLists();
        return true;
      } catch (err) {
        toast({
          title: "Erro ao excluir lista",
          description: "Não foi possível excluir a lista.",
          variant: "destructive",
        });
        return false;
      }
    },
    [fetchLists, toast]
  );

  useEffect(() => {
    fetchLists();
    const channel = supabase
      .channel(`personal_lists_${user?.id || "anon"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "personal_lists" },
        () => fetchLists()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLists, user?.id]);

  return { lists, loading, fetchLists, createList, renameList, deleteList };
}
