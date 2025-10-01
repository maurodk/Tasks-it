-- Remover políticas existentes que podem estar conflitando
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;

-- Criar bucket para avatars se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir visualização pública dos avatars
CREATE POLICY "Public avatar access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Política para permitir upload de avatars (usuários autenticados)
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Política para permitir que usuários atualizem qualquer avatar (simplificado)
CREATE POLICY "Authenticated users can update avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars');

-- Política para permitir que usuários deletem qualquer avatar (simplificado)
CREATE POLICY "Authenticated users can delete avatars" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars');
