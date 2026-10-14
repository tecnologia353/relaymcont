"use client";

import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Button, Field, IconButton, Input, Select, Sheet, Textarea, priorityOrder, useToast } from "@/components/ui";
import { priorityLabel } from "@/lib/api";
import type { Priority } from "@/lib/api";
import { emit } from "@/lib/events";
import { createTask } from "./tasks-api";
import { COMPETENCE_PATTERN, currentCompetence, defaultChecklist } from "./task-utils";
import type { ReferenceData } from "./use-task-data";

interface FormState {
  title: string;
  description: string;
  client_id: string;
  assignee_id: string;
  department_id: string;
  reviewer_id: string;
  due_date: string;
  priority: Priority;
  competence: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const FORM_ID = "form-nova-tarefa";

const initialForm = (): FormState => ({
  title: "",
  description: "",
  client_id: "",
  assignee_id: "",
  department_id: "",
  reviewer_id: "",
  due_date: "",
  priority: "normal",
  competence: currentCompetence(),
});

function validate(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.title.trim()) errors.title = "Informe o título da tarefa.";
  if (!form.client_id) errors.client_id = "Selecione o cliente.";
  if (!form.assignee_id) errors.assignee_id = "Selecione o responsável.";
  if (!form.department_id) errors.department_id = "Selecione o departamento.";
  if (!form.due_date) errors.due_date = "Informe o prazo.";
  else if (Number.isNaN(new Date(form.due_date).getTime())) errors.due_date = "Data inválida.";
  if (!COMPETENCE_PATTERN.test(form.competence.trim())) errors.competence = "Use o formato MM/AAAA, ex.: 10/2026.";
  return errors;
}

interface TaskCreateProps {
  open: boolean;
  onClose: () => void;
  onCreated: (taskId: number) => void;
  reference: ReferenceData;
}

export function TaskCreate({ open, onClose, onCreated, reference }: TaskCreateProps) {
  // Remonta a cada abertura para começar com o formulário limpo.
  return open ? <TaskCreateForm onClose={onClose} onCreated={onCreated} reference={reference} /> : null;
}

function TaskCreateForm({ onClose, onCreated, reference }: Omit<TaskCreateProps, "open">) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(initialForm);
  const [checklist, setChecklist] = useState<string[]>(defaultChecklist);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const departmentTouched = useRef(false);
  const checklistRefs = useRef<(HTMLInputElement | null)[]>([]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      // Sugere o departamento do responsável enquanto o usuário não escolher outro.
      if (key === "assignee_id" && !departmentTouched.current) {
        const user = reference.users.find((item) => String(item.id) === value);
        if (user?.department_id) next.department_id = String(user.department_id);
      }
      return next;
    });
    if (key === "department_id") departmentTouched.current = true;
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const addChecklistItem = (index: number) => {
    setChecklist((items) => [...items.slice(0, index + 1), "", ...items.slice(index + 1)]);
    requestAnimationFrame(() => checklistRefs.current[index + 1]?.focus());
  };

  const onChecklistKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addChecklistItem(index);
    } else if (event.key === "Backspace" && !checklist[index] && checklist.length > 1) {
      event.preventDefault();
      setChecklist((items) => items.filter((_, position) => position !== index));
      requestAnimationFrame(() => checklistRefs.current[Math.max(0, index - 1)]?.focus());
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      document.querySelector<HTMLElement>(`#${FORM_ID} [name="${firstInvalid}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const task = await createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        competence: form.competence.trim(),
        priority: form.priority,
        status: "todo",
        client_id: Number(form.client_id),
        department_id: Number(form.department_id),
        assignee_id: Number(form.assignee_id),
        reviewer_id: form.reviewer_id ? Number(form.reviewer_id) : null,
        due_date: new Date(form.due_date).toISOString(),
        checklist: checklist.map((title) => title.trim()).filter(Boolean).map((title) => ({ title })),
      });
      emit("tasks:changed");
      emit("notifications:changed");
      toast({ tone: "success", title: "Tarefa criada", description: task.title });
      onCreated(task.id);
    } catch (error) {
      toast({ tone: "error", title: "Não foi possível criar a tarefa", description: (error as Error).message });
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      dismissible={!submitting}
      title="Nova tarefa"
      description="Campos sem a marcação “Opcional” são obrigatórios."
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={submitting}>
            Criar tarefa
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={submit} className="space-y-5">
        <Field label="Título" error={errors.title}>
          {(control) => (
            <Input {...control} name="title" value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="Ex.: Apuração ICMS - Empresa ABC" data-autofocus />
          )}
        </Field>

        <Field label="Descrição" optional>
          {(control) => (
            <Textarea {...control} name="description" value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Contexto, documentos necessários, observações…" />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Cliente" error={errors.client_id}>
            {(control) => (
              <Select {...control} name="client_id" value={form.client_id} onChange={(event) => set("client_id", event.target.value)}>
                <option value="">Selecione</option>
                {reference.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.trade_name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Prazo" error={errors.due_date}>
            {(control) => <Input {...control} name="due_date" type="datetime-local" value={form.due_date} onChange={(event) => set("due_date", event.target.value)} />}
          </Field>
          <Field label="Responsável" error={errors.assignee_id}>
            {(control) => (
              <Select {...control} name="assignee_id" value={form.assignee_id} onChange={(event) => set("assignee_id", event.target.value)}>
                <option value="">Selecione</option>
                {reference.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Departamento" error={errors.department_id} hint={!departmentTouched.current && form.department_id ? "Sugerido pelo responsável." : undefined}>
            {(control) => (
              <Select {...control} name="department_id" value={form.department_id} onChange={(event) => set("department_id", event.target.value)}>
                <option value="">Selecione</option>
                {reference.departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Revisor" optional>
            {(control) => (
              <Select {...control} name="reviewer_id" value={form.reviewer_id} onChange={(event) => set("reviewer_id", event.target.value)}>
                <option value="">Sem revisor</option>
                {reference.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Prioridade">
            {(control) => (
              <Select {...control} name="priority" value={form.priority} onChange={(event) => set("priority", event.target.value as Priority)}>
                {priorityOrder.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabel[priority]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Competência" error={errors.competence}>
            {(control) => (
              <Input {...control} name="competence" inputMode="numeric" placeholder="MM/AAAA" value={form.competence} onChange={(event) => set("competence", event.target.value)} />
            )}
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1.5 flex w-full items-baseline justify-between text-sm font-medium text-fg">
            Checklist
            <span className="text-xs font-normal text-fg-subtle">Enter adiciona um item</span>
          </legend>
          <ul className="space-y-1.5">
            {checklist.map((item, index) => (
              <li key={index} className="flex items-center gap-1.5">
                <span className="w-5 shrink-0 text-right text-xs tabular-nums text-fg-subtle">{index + 1}.</span>
                <Input
                  ref={(element) => {
                    checklistRefs.current[index] = element;
                  }}
                  aria-label={`Item ${index + 1} do checklist`}
                  value={item}
                  onChange={(event) => setChecklist((items) => items.map((value, position) => (position === index ? event.target.value : value)))}
                  onKeyDown={(event) => onChecklistKeyDown(event, index)}
                  className="flex-1"
                />
                <IconButton
                  label={`Remover item ${index + 1}`}
                  icon={<X size={14} />}
                  size="sm"
                  tooltip={false}
                  onClick={() => setChecklist((items) => items.filter((_, position) => position !== index))}
                />
              </li>
            ))}
          </ul>
          <Button size="sm" variant="ghost" className="ml-5 mt-2" leadingIcon={<Plus size={14} aria-hidden />} onClick={() => addChecklistItem(checklist.length - 1)}>
            Adicionar item
          </Button>
        </fieldset>
      </form>
    </Sheet>
  );
}
