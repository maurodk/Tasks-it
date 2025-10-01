-- Create default sectors for the system
INSERT INTO public.sectors (name, description) VALUES
('Tecnologia da Informação', 'Setor responsável por desenvolvimento, infraestrutura e suporte tecnológico'),
('Recursos Humanos', 'Gestão de pessoas, recrutamento e desenvolvimento organizacional'),
('Financeiro', 'Controle financeiro, contabilidade e orçamentos'),
('Marketing', 'Comunicação, branding e estratégias de mercado'),
('Operações', 'Gestão operacional e processos internos')
ON CONFLICT (name) DO NOTHING;

-- Create default subsectors
INSERT INTO public.subsectors (name, description, sector_id) 
SELECT 'Desenvolvimento', 'Equipe de desenvolvimento de software', s.id
FROM public.sectors s WHERE s.name = 'Tecnologia da Informação'
UNION ALL
SELECT 'Infraestrutura', 'Gestão de servidores e redes', s.id  
FROM public.sectors s WHERE s.name = 'Tecnologia da Informação'
UNION ALL
SELECT 'Recrutamento', 'Processo seletivo e contratação', s.id
FROM public.sectors s WHERE s.name = 'Recursos Humanos'
UNION ALL
SELECT 'Treinamento', 'Capacitação e desenvolvimento', s.id
FROM public.sectors s WHERE s.name = 'Recursos Humanos'
ON CONFLICT (name, sector_id) DO NOTHING;