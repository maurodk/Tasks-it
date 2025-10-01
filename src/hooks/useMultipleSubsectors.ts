import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useMultipleSubsectors = (profileId?: string) => {
  const [subsectors, setSubsectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSubsectors = async () => {
    if (!profileId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profile_subsectors')
        .select('subsector_id')
        .eq('profile_id', profileId);

      if (error) throw error;
      setSubsectors(data?.map(item => item.subsector_id) || []);
    } catch (error) {
      console.error('Erro ao buscar subsetores:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSubsectors = async (newSubsectors: string[]) => {
    if (!profileId) return false;

    try {
      // Remover todos os subsetores existentes
      await supabase
        .from('profile_subsectors')
        .delete()
        .eq('profile_id', profileId);

      // Adicionar novos subsetores
      if (newSubsectors.length > 0) {
        const { error } = await supabase
          .from('profile_subsectors')
          .insert(
            newSubsectors.map(subsectorId => ({
              profile_id: profileId,
              subsector_id: subsectorId
            }))
          );

        if (error) throw error;
      }

      setSubsectors(newSubsectors);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar subsetores:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar os subsetores.',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSubsectors();
  }, [profileId]);

  return {
    subsectors,
    loading,
    updateSubsectors,
    refetch: fetchSubsectors,
  };
};