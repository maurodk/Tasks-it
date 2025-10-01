-- Função para deletar atividades com permissões de SECURITY DEFINER
-- Isso bypassa as políticas RLS e permite que qualquer usuário autenticado
-- delete atividades que ele criou ou atividades do seu setor se for manager
CREATE OR REPLACE FUNCTION delete_activity(activity_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_sector_id UUID;
    user_role user_role;
    activity_user_id UUID;
    activity_sector_id UUID;
BEGIN
    -- Obter informações do usuário atual
    SELECT sector_id, role INTO user_sector_id, user_role
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Obter informações da atividade
    SELECT user_id, sector_id INTO activity_user_id, activity_sector_id
    FROM activities 
    WHERE id = activity_id;
    
    -- Verificar se a atividade existe
    IF activity_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar permissões:
    -- 1. Usuário é o criador da atividade, OU
    -- 2. Usuário é manager do mesmo setor
    IF (activity_user_id = auth.uid()) OR 
       (user_role = 'manager' AND user_sector_id = activity_sector_id) THEN
        
        -- Deletar a atividade
        DELETE FROM activities WHERE id = activity_id;
        
        -- Retornar sucesso
        RETURN TRUE;
    ELSE
        -- Sem permissão
        RETURN FALSE;
    END IF;
END;
$$;
