import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useMultipleAssignees = (activityId?: string) => {
  const [assignees, setAssignees] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAssignees = async () => {
    if (!activityId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_assignees')
        .select('user_id')
        .eq('activity_id', activityId);

      if (error) throw error;
      setAssignees(data?.map(item => item.user_id) || []);
    } catch (error) {
      console.error('Erro ao buscar responsáveis:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAssignees = async (newAssignees: string[]) => {
    if (!activityId) return false;

    try {
      // Remover todos os responsáveis existentes
      await supabase
        .from('activity_assignees')
        .delete()
        .eq('activity_id', activityId);

      // Adicionar novos responsáveis
      if (newAssignees.length > 0) {
        const { error } = await supabase
          .from('activity_assignees')
          .insert(
            newAssignees.map(userId => ({
              activity_id: activityId,
              user_id: userId
            }))
          );

        if (error) throw error;
      }

      setAssignees(newAssignees);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar responsáveis:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar os responsáveis.',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchAssignees();
  }, [activityId]);

  return {
    assignees,
    loading,
    updateAssignees,
    refetch: fetchAssignees,
  };
};