-- Adicionar subsetores para todos os setores existentes
-- Esta migração garante que todos os setores tenham pelo menos alguns subsetores

-- Primeiro, vamos buscar todos os setores existentes e adicionar subsetores genéricos
DO $$
DECLARE
    sector_record RECORD;
BEGIN
    -- Para cada setor existente, criar subsetores padrão se não existirem
    FOR sector_record IN SELECT id, name FROM sectors LOOP
        -- Verificar se já existem subsetores para este setor
        IF NOT EXISTS (SELECT 1 FROM subsectors WHERE sector_id = sector_record.id) THEN
            -- Criar subsetores genéricos baseados no nome do setor
            INSERT INTO subsectors (id, name, description, sector_id, created_at, updated_at) VALUES
                (gen_random_uuid(), sector_record.name || ' - Operações', 'Operações gerais do setor', sector_record.id, NOW(), NOW()),
                (gen_random_uuid(), sector_record.name || ' - Análise', 'Análise e planejamento', sector_record.id, NOW(), NOW()),
                (gen_random_uuid(), sector_record.name || ' - Gestão', 'Gestão e coordenação', sector_record.id, NOW(), NOW());
        END IF;
    END LOOP;
END $$;
