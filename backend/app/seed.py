from datetime import datetime, timedelta
from random import choice, randint, seed

from sqlalchemy import select

from app.core.db import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.entities import (
    ActivityLog, Client, Department, Notification, Organization, Priority, ProcessTemplate,
    ProcessTemplateStep, Role, Task, TaskChecklist, TaskComment, TaskStatus, User,
)

seed(7)


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.scalar(select(User).where(User.email == "admin@relay.demo")):
            print("Seed já existe.")
            return
        org = Organization(name="Relay Contabilidade Demo")
        db.add(org)
        db.flush()
        departments = {name: Department(organization_id=org.id, name=name) for name in ["Fiscal", "Contábil", "Departamento Pessoal", "Societário"]}
        db.add_all(departments.values())
        db.flush()
        people = [
            ("Carlos Mendes", "admin@relay.demo", Role.admin, "Administrador", "Contábil"),
            ("Marina Rocha", "marina@relay.demo", Role.manager, "Gestora Operacional", "Fiscal"),
            ("João Lima", "joao@relay.demo", Role.supervisor, "Supervisor Fiscal", "Fiscal"),
            ("Vitor Alves", "vitor@relay.demo", Role.collaborator, "Analista Fiscal", "Fiscal"),
            ("Ana Souza", "ana@relay.demo", Role.collaborator, "Analista Contábil", "Contábil"),
            ("Paula Nunes", "paula@relay.demo", Role.supervisor, "Supervisora DP", "Departamento Pessoal"),
            ("Rafael Costa", "rafael@relay.demo", Role.collaborator, "Assistente DP", "Departamento Pessoal"),
            ("Bianca Prado", "bianca@relay.demo", Role.collaborator, "Analista Societário", "Societário"),
        ]
        users = []
        for name, email, role, position, dept in people:
            users.append(User(organization_id=org.id, department_id=departments[dept].id, name=name, email=email, password_hash=hash_password("relay123"), role=role, position=position, active=True))
        db.add_all(users)
        db.flush()
        companies = ["Empresa ABC", "Mercado Horizonte", "Clínica São Bento", "Alfa Transportes", "Padaria Central", "Moura Tech", "Grupo Aurora", "Oficina União", "Beta Serviços", "Casa Verde", "Norte Foods", "Lumen Energia"]
        regimes = ["Simples Nacional", "Lucro Presumido", "Lucro Real"]
        clients = []
        for i, name in enumerate(companies, start=1):
            clients.append(Client(organization_id=org.id, internal_owner_id=choice(users).id, legal_name=f"{name} Ltda.", trade_name=name, cnpj=f"12.345.{i:03d}/0001-{i+10:02d}", tax_regime=choice(regimes), phone=f"(11) 9{randint(1000,9999)}-{randint(1000,9999)}", email=f"contato{i}@cliente.demo", status="active", notes="Cliente ativo com rotinas mensais."))
        db.add_all(clients)
        db.flush()
        template = ProcessTemplate(organization_id=org.id, department_id=departments["Fiscal"].id, name="Fechamento Fiscal Mensal")
        template.steps = [ProcessTemplateStep(title=title, position=i) for i, title in enumerate(["Receber documentos", "Conferir notas", "Importar documentos", "Realizar apuração", "Revisar", "Gerar guias", "Enviar ao cliente", "Concluir"], 1)]
        db.add(template)
        titles = ["Apuração ICMS", "Emitir DAS", "Fechamento contábil", "Folha de pagamento", "Admissão de funcionário", "Alteração contratual", "Entrega DCTFWeb", "Conciliação bancária", "Envio eSocial", "Revisão de notas fiscais"]
        checklist = ["Importar documentos", "Conferir informações", "Realizar apuração", "Revisar", "Enviar ao cliente"]
        now = datetime.utcnow()
        tasks = []
        for i in range(44):
            dept = choice(list(departments.values()))
            assignee = choice([u for u in users if u.role != Role.admin])
            status = choice(list(TaskStatus))
            due = now + timedelta(days=randint(-6, 18), hours=choice([9, 14, 17]))
            task = Task(organization_id=org.id, client_id=choice(clients).id, department_id=dept.id, assignee_id=assignee.id, reviewer_id=choice(users).id, creator_id=users[0].id, title=f"{choice(titles)} - {choice(companies)}", description="Rotina operacional do escritório com prazo e responsável definidos.", due_date=due, priority=choice(list(Priority)), status=status, competence="10/2026", completed_at=now if status == TaskStatus.done else None)
            task.checklist = [TaskChecklist(title=item, done=randint(0, 1) == 1) for item in checklist]
            task.comments = [TaskComment(author_id=choice(users).id, body=choice(["Documentos recebidos e conferidos.", "@Vitor precisamos revisar este ponto.", "Cliente retornou com as informações pendentes."]))]
            tasks.append(task)
        db.add_all(tasks)
        db.flush()
        for task in tasks[:20]:
            db.add(ActivityLog(organization_id=org.id, actor_id=users[0].id, task_id=task.id, entity="task", entity_id=task.id, action="created", detail="Tarefa criada pelo seed"))
            db.add(Notification(organization_id=org.id, user_id=task.assignee_id, task_id=task.id, message=f"Carlos atribuiu uma tarefa a você: {task.title}"))
        db.commit()
        print("Seed concluído. Login: admin@relay.demo / relay123")
    finally:
        db.close()


if __name__ == "__main__":
    run()
