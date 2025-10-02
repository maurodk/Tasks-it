-- Criar setor Imobiliário se não existir
-- Criar um setor padrão se não existir
INSERT INTO sectors (id, name, description, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Setor Padrão',
  'Setor padrão para novas instalações',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Criar subsetores predefinidos para o primeiro setor encontrado
INSERT INTO subsectors (id, name, description, sector_id, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Desenvolvimento', 'Desenvolvimento e manutenção de sistemas', (SELECT id FROM sectors LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Análise', 'Análise de dados e documentação', (SELECT id FROM sectors LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Financeiro', 'Processamento financeiro e crédito', (SELECT id FROM sectors LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Jurídico', 'Elaboração e gestão de contratos', (SELECT id FROM sectors LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Relacionamento', 'Relacionamento com clientes', (SELECT id FROM sectors LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Auditoria', 'Auditoria interna e compliance', (SELECT id FROM sectors LIMIT 1), NOW(), NOW()),
  (gen_random_uuid(), 'Estratégico', 'Expansão de negócios e novos mercados', (SELECT id FROM sectors LIMIT 1), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Adicionar/Atualizar a constraint para garantir que os roles válidos sejam usados
DO $$ 
BEGIN
    -- Remove a constraint antiga se existir, para garantir que a nova seja aplicada.
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

    -- Adiciona a nova constraint com a role 'guest' incluída.
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('collaborator', 'manager', 'guest'));
END $$;
