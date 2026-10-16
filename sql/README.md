# Banco de dados no Supabase

| Arquivo | O que faz |
| --- | --- |
| `01_schema.sql` | Cria tipos, tabelas, índices, trigger de `updated_at` e liga RLS em todas as tabelas. Pode rodar de novo sem erro. |
| `02_seed_inicial.sql` | Cria o escritório, os 4 departamentos padrão e um administrador. Edite nome, e-mail e senha no topo antes de rodar. |

## Passo a passo

1. No painel do Supabase, abra **SQL Editor**, cole `01_schema.sql` e rode.
2. Edite as variáveis no topo de `02_seed_inicial.sql`, cole e rode.
   - Para dados de demonstração completos, pule este arquivo e rode `python -m app.seed` dentro de `backend/`.
3. Em **Connect** (botão no topo do painel), copie a connection string do **Session pooler** e coloque no `backend/.env`, trocando o prefixo para `postgresql+psycopg://`:

   ```env
   DATABASE_URL=postgresql+psycopg://postgres.<project-ref>:<senha>@aws-0-<regiao>.pooler.supabase.com:5432/postgres?sslmode=require
   ```

   Use o Session pooler (porta 5432) ou a conexão direta. O Transaction pooler (porta 6543) não aceita os prepared statements que o psycopg usa.

## Segurança

O backend FastAPI acessa o banco com o usuário `postgres`, que ignora RLS. As tabelas ficam com RLS ligado **e sem políticas** de propósito: assim a API REST pública do Supabase (chaves `anon` e `authenticated`) não lê nem grava nada. Não crie políticas liberando essas tabelas, porque `users` guarda hashes de senha.

## Alembic

O script registra a migração `0001_initial` em `alembic_version`, então `alembic upgrade head` não tenta recriar as tabelas. O esquema já inclui campos que o frontend usa e que ainda não estão em `backend/app/models/entities.py`: a tabela `invites`, `tasks.process_id`, `process_template_steps.due_day`, `process_templates.description`, `due_month_offset` e `created_at`, e em `processes` os campos `assignee_id`, `creator_id` e `created_at`. Quando esses modelos forem adicionados ao backend, crie uma migração vazia (só o `revision`) para manter o Alembic em sincronia.
