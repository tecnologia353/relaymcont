"""initial

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-07
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    role = sa.Enum("admin", "manager", "supervisor", "collaborator", name="role")
    status = sa.Enum("todo", "in_progress", "waiting_client", "in_review", "done", "canceled", name="taskstatus")
    priority = sa.Enum("low", "normal", "high", "urgent", name="priority")
    role.create(op.get_bind(), checkfirst=True)
    status.create(op.get_bind(), checkfirst=True)
    priority.create(op.get_bind(), checkfirst=True)
    op.create_table("organizations", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(180), nullable=False), sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False))
    op.create_table("departments", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False), sa.Column("name", sa.String(120), nullable=False))
    op.create_table("users", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False), sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=True), sa.Column("name", sa.String(160), nullable=False), sa.Column("email", sa.String(180), nullable=False), sa.Column("password_hash", sa.String(255), nullable=False), sa.Column("role", role, nullable=False), sa.Column("position", sa.String(120), nullable=False), sa.Column("active", sa.Boolean(), nullable=False))
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table("clients", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False), sa.Column("internal_owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True), sa.Column("legal_name", sa.String(180), nullable=False), sa.Column("trade_name", sa.String(160), nullable=False), sa.Column("cnpj", sa.String(24), nullable=False), sa.Column("tax_regime", sa.String(80), nullable=False), sa.Column("phone", sa.String(40), nullable=True), sa.Column("email", sa.String(180), nullable=True), sa.Column("status", sa.String(40), nullable=False), sa.Column("notes", sa.Text(), nullable=True))
    op.create_table("tasks", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False), sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False), sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=False), sa.Column("assignee_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("reviewer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True), sa.Column("creator_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("title", sa.String(220), nullable=False), sa.Column("description", sa.Text(), nullable=True), sa.Column("due_date", sa.DateTime(), nullable=False), sa.Column("competence", sa.String(20), nullable=False), sa.Column("priority", priority, nullable=False), sa.Column("status", status, nullable=False), sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False), sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False), sa.Column("completed_at", sa.DateTime(), nullable=True))
    op.create_table("task_checklists", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id"), nullable=False), sa.Column("title", sa.String(180), nullable=False), sa.Column("done", sa.Boolean(), nullable=False))
    op.create_table("task_comments", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id"), nullable=False), sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("body", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False))
    op.create_table("task_attachments", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id"), nullable=False), sa.Column("filename", sa.String(180), nullable=False), sa.Column("storage_key", sa.String(255), nullable=False))
    op.create_table("process_templates", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False), sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=False), sa.Column("name", sa.String(180), nullable=False))
    op.create_table("process_template_steps", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("template_id", sa.Integer(), sa.ForeignKey("process_templates.id"), nullable=False), sa.Column("title", sa.String(180), nullable=False), sa.Column("position", sa.Integer(), nullable=False))
    op.create_table("processes", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False), sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False), sa.Column("template_id", sa.Integer(), sa.ForeignKey("process_templates.id"), nullable=True), sa.Column("name", sa.String(180), nullable=False), sa.Column("competence", sa.String(20), nullable=False), sa.Column("status", sa.String(40), nullable=False))
    op.create_table("notifications", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id"), nullable=True), sa.Column("message", sa.String(255), nullable=False), sa.Column("read", sa.Boolean(), nullable=False), sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False))
    op.create_table("activity_logs", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False), sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True), sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id"), nullable=True), sa.Column("entity", sa.String(80), nullable=False), sa.Column("entity_id", sa.Integer(), nullable=False), sa.Column("action", sa.String(80), nullable=False), sa.Column("detail", sa.Text(), nullable=True), sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False))


def downgrade():
    for table in ["activity_logs", "notifications", "processes", "process_template_steps", "process_templates", "task_attachments", "task_comments", "task_checklists", "tasks", "clients", "users", "departments", "organizations"]:
        op.drop_table(table)
    sa.Enum(name="priority").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="taskstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="role").drop(op.get_bind(), checkfirst=True)
