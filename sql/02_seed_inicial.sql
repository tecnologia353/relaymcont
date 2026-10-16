-- =============================================================================
-- Relay — dados iniciais mínimos para o primeiro acesso
--
-- Cria o escritório, os departamentos padrão e um administrador.
-- Troque o nome, o e-mail e a senha abaixo antes de rodar e altere a senha
-- depois do primeiro login.
--
-- Para dados de demonstração completos (clientes, tarefas etc.), use em vez
-- deste arquivo o seed do backend: `python -m app.seed`.
-- =============================================================================

begin;

do $$
declare
  v_org_name   text := 'Meu Escritório Contábil';
  v_admin_name text := 'Administrador';
  v_email      text := 'admin@relay.demo';
  v_password   text := 'troque-esta-senha';
  v_org_id     integer;
  v_dept_id    integer;
begin
  if exists (select 1 from public.users where lower(email) = lower(v_email)) then
    raise notice 'Usuário % já existe; nada foi criado.', v_email;
    return;
  end if;

  insert into public.organizations (name) values (v_org_name) returning id into v_org_id;

  insert into public.departments (organization_id, name)
  values (v_org_id, 'Fiscal'), (v_org_id, 'Contábil'), (v_org_id, 'Departamento Pessoal'), (v_org_id, 'Societário');

  select id into v_dept_id from public.departments where organization_id = v_org_id and name = 'Contábil';

  -- bcrypt via pgcrypto (no Supabase fica no schema `extensions`);
  -- o passlib do backend valida esse hash normalmente.
  insert into public.users (organization_id, department_id, name, email, password_hash, role, position, active)
  values (v_org_id, v_dept_id, v_admin_name, v_email,
          extensions.crypt(v_password, extensions.gen_salt('bf', 12)),
          'admin', 'Administrador', true);
end $$;

commit;
