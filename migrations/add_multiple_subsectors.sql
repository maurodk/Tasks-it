-- Criar tabela de relacionamento entre profiles e subsectors
CREATE TABLE IF NOT EXISTS profile_subsectors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subsector_id UUID NOT NULL REFERENCES subsectors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, subsector_id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profile_subsectors_profile_id ON profile_subsectors(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_subsectors_subsector_id ON profile_subsectors(subsector_id);

-- Migrar dados existentes da coluna subsector_id para a nova tabela
INSERT INTO profile_subsectors (profile_id, subsector_id)
SELECT id, subsector_id 
FROM profiles 
WHERE subsector_id IS NOT NULL
ON CONFLICT (profile_id, subsector_id) DO NOTHING;

-- Criar tabela para múltiplos responsáveis por atividade
CREATE TABLE IF NOT EXISTS activity_assignees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(activity_id, user_id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_activity_assignees_activity_id ON activity_assignees(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_assignees_user_id ON activity_assignees(user_id);

-- Migrar dados existentes da coluna user_id para a nova tabela
INSERT INTO activity_assignees (activity_id, user_id)
SELECT id, user_id 
FROM activities 
WHERE user_id IS NOT NULL
ON CONFLICT (activity_id, user_id) DO NOTHING;

-- Habilitar RLS nas novas tabelas
ALTER TABLE profile_subsectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_assignees ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profile_subsectors
CREATE POLICY "Users can view profile_subsectors in their sector" ON profile_subsectors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p1, profiles p2 
      WHERE p1.id = auth.uid() 
      AND p2.id = profile_subsectors.profile_id 
      AND p1.sector_id = p2.sector_id
    )
  );

CREATE POLICY "Managers can manage profile_subsectors in their sector" ON profile_subsectors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p1, profiles p2 
      WHERE p1.id = auth.uid() 
      AND p1.role = 'manager'
      AND p2.id = profile_subsectors.profile_id 
      AND p1.sector_id = p2.sector_id
    )
  );

-- Políticas RLS para activity_assignees
CREATE POLICY "Users can view activity_assignees in their sector" ON activity_assignees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p, activities a
      WHERE p.id = auth.uid() 
      AND a.id = activity_assignees.activity_id
      AND p.sector_id = a.sector_id
    )
  );

CREATE POLICY "Users can manage activity_assignees for their activities" ON activity_assignees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p, activities a
      WHERE p.id = auth.uid() 
      AND a.id = activity_assignees.activity_id
      AND (p.role = 'manager' OR a.created_by = auth.uid())
      AND p.sector_id = a.sector_id
    )
  );