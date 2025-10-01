-- Remover políticas RLS desnecessárias para subsetores
-- já que a lógica de acesso é controlada pela aplicação

-- Remover políticas da tabela profile_subsectors
DROP POLICY IF EXISTS "Users can view profile_subsectors in their sector" ON profile_subsectors;
DROP POLICY IF EXISTS "Managers can manage profile_subsectors in their sector" ON profile_subsectors;

-- Remover políticas da tabela activity_assignees  
DROP POLICY IF EXISTS "Users can view activity_assignees in their sector" ON activity_assignees;
DROP POLICY IF EXISTS "Users can manage activity_assignees for their activities" ON activity_assignees;

-- Criar políticas mais simples baseadas apenas no setor
CREATE POLICY "Users can view profile_subsectors in same sector" ON profile_subsectors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p1, profiles p2 
      WHERE p1.id = auth.uid() 
      AND p2.id = profile_subsectors.profile_id 
      AND p1.sector_id = p2.sector_id
    )
  );

CREATE POLICY "Managers can manage profile_subsectors" ON profile_subsectors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'manager'
    )
  );

CREATE POLICY "Users can view activity_assignees" ON activity_assignees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p, activities a
      WHERE p.id = auth.uid() 
      AND a.id = activity_assignees.activity_id
      AND p.sector_id = a.sector_id
    )
  );

CREATE POLICY "Users can manage activity_assignees" ON activity_assignees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'manager'
    )
  );