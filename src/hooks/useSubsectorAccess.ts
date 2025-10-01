import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export const useSubsectorAccess = (subsectorId?: string) => {
  const { profile } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!profile?.id || !subsectorId) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        // Verificar se tem acesso via nova tabela profile_subsectors
        const { data: profileSubsector } = await supabase
          .from('profile_subsectors')
          .select('id')
          .eq('profile_id', profile.id)
          .eq('subsector_id', subsectorId)
          .single();

        // Verificar se tem acesso via campo antigo subsector_id (compatibilidade)
        const hasOldAccess = profile.subsector_id === subsectorId;

        setHasAccess(!!profileSubsector || hasOldAccess);
      } catch (error) {
        console.error('Erro ao verificar acesso ao subsetor:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [profile?.id, subsectorId, profile?.subsector_id]);

  return { hasAccess, loading };
};