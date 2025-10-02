-- Função para limpar usuários 'guest' antigos e seus dados associados.
-- Função para limpar DADOS (atividades e quadros) antigos de usuários 'guest'.
-- Esta função deleta atividades e quadros pessoais com mais de 5 minutos que foram criados por qualquer usuário com a role 'guest'.
-- Isso mantém os usuários de teste, mas limpa os dados que eles criam. A exclusão das atividades
-- irá cascatear para as subtarefas associadas.

-- Remover a função antiga para permitir a alteração do tipo de retorno.
DROP FUNCTION IF EXISTS public.cleanup_old_guest_activities(); -- Remove a versão antiga
DROP FUNCTION IF EXISTS public.cleanup_old_guest_data(); -- Garante que podemos recriar
CREATE OR REPLACE FUNCTION public.cleanup_old_guest_data()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_activities_count integer;
  deleted_lists_count integer;
BEGIN
  -- 1. Deletar atividades antigas de usuários 'guest'
  WITH deleted_activities AS (
    DELETE FROM public.activities
    WHERE
      created_at < NOW() - INTERVAL '5 minutes'
      AND created_by IN (SELECT id FROM public.profiles WHERE role = 'guest')
    RETURNING id
  )
  SELECT count(*) INTO deleted_activities_count FROM deleted_activities;

  -- 2. Deletar quadros (personal_lists) antigos de usuários 'guest'
  WITH deleted_lists AS (
    DELETE FROM public.personal_lists
    WHERE
      created_at < NOW() - INTERVAL '5 minutes'
      AND user_id IN (SELECT id FROM public.profiles WHERE role = 'guest')
    RETURNING id
  )
  SELECT count(*) INTO deleted_lists_count FROM deleted_lists;

  -- 3. Retornar o total de registros apagados (atividades + quadros)
  RETURN deleted_activities_count + deleted_lists_count;
END;
$$;

-- Agendamento da função para rodar diariamente
-- (Execute isso na seção "Database" -> "Cron Jobs" do painel do Supabase)
-- Lembre-se de atualizar o comando no seu Cron Job para usar a nova função:
-- SELECT cron.schedule('daily-guest-cleanup', '0 0 * * *', 'SELECT public.cleanup_old_guest_data()');