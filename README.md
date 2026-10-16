<p align="center">
  <img src="assets/banner.png" alt="Relay — gestão interna para escritórios de contabilidade" width="100%" />
</p>

# Relay

Gestão interna para escritórios de contabilidade: tarefas, processos recorrentes por cliente e competência, calendário de prazos, clientes e equipe com hierarquia de acesso.

## Funcionalidades

- **Meu dia e Início**: prazos críticos, próximos vencimentos e andamento por departamento.
- **Tarefas e Operação**: lista, quadro e tabela, com status, prioridade, checklist, comentários e histórico.
- **Processos**: modelos com etapas (ex.: fechamento mensal) iniciados em lote por cliente e competência, gerando uma tarefa por etapa.
- **Calendário**: visão dos prazos do mês.
- **Clientes**: cadastro com CNPJ, regime tributário e responsável interno.
- **Equipe**: convites por link, departamentos e perfis de acesso (Administrador, Gestor, Supervisor e Colaborador).

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy 2, Alembic |
| Banco | PostgreSQL (local via Docker ou Supabase) |

## Estrutura

```
backend/    API FastAPI (modelos, rotas, seed, migrações)
frontend/   Aplicação Next.js
sql/        Scripts do banco para o Supabase
assets/     Imagens do repositório
```

## Como rodar

### Banco de dados

Local, com Docker:

```bash
docker compose up -d
```

Ou no Supabase: siga [sql/README.md](sql/README.md).

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows (no Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env          # ajuste DATABASE_URL e SECRET_KEY
python -m app.seed              # dados de demonstração (opcional)
uvicorn app.main:app --reload
```

A API sobe em `http://localhost:8000` (documentação em `/docs`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

O app abre em `http://localhost:3000`.

## Acesso de demonstração

Com o seed do backend, entre com `admin@relay.demo` e a senha `relay123`.
