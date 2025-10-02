-- Tornar a coluna sector_id opcional na tabela de atividades
-- Isso é necessário para que usuários 'guest' possam criar atividades pessoais
-- sem estarem vinculados a um setor.
ALTER TABLE public.activities
ALTER COLUMN sector_id DROP NOT NULL;