-- NÃO APLICADO. Remove 5 contas de teste/pentest com acesso de equipe e nenhum dado vinculado.
-- Irreversível: rodar manualmente no SQL Editor do Supabase após conferir a lista.
-- Contas de teste/pentest com acesso de equipe e nenhum dado vinculado
DO $$
DECLARE ids uuid[] := ARRAY['fbb5ad13-4cf8-4b1c-963d-ff60d530e525','554a9a97-4bb3-459c-8b40-8c7d03865ae1',
  '1c5d16cc-e4d8-4f6d-be93-e3db244f12d0','a4c23212-8f88-4f27-b849-11f41bcca35b','965901b3-7699-4a14-ad0b-fb364d009771']::uuid[];
  r record; n bigint;
BEGIN
  FOR r IN SELECT c.conrelid::regclass::text tbl, a.attname col FROM pg_constraint c
           JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
           WHERE c.contype = 'f' AND c.confrelid IN ('auth.users'::regclass, 'public.profiles'::regclass)
             AND c.connamespace = 'public'::regnamespace AND c.conrelid <> 'public.profiles'::regclass LOOP
    EXECUTE format('SELECT count(*) FROM %s WHERE %I = ANY ($1)', r.tbl, r.col) INTO n USING ids;
    IF n > 0 THEN RAISE EXCEPTION 'Conta de teste com dados em %.%: abortando', r.tbl, r.col; END IF;
  END LOOP;
  DELETE FROM auth.users WHERE id = ANY (ids);
END $$;
