-- Adiciona o valor 'guest' ao ENUM 'user_role'
-- Isso precisa ser feito em uma transação separada antes de ser usado em constraints.
DO $$
BEGIN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'guest';
END $$;