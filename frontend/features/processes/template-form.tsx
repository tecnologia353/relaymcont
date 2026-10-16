"use client";

import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button, Field, IconButton, Input, Select, Sheet, Textarea, useToast } from "@/components/ui";
import type { Department, ProcessTemplate } from "@/lib/api";
import { createTemplate, updateTemplate } from "./processes-api";
import { dueMonthLabel } from "./process-utils";

interface StepDraft {
  key: number;
  id?: number;
  title: string;
  due_day: string;
}

interface FormState {
  name: string;
  description: string;
  department_id: string;
  due_month_offset: "0" | "1";
  steps: StepDraft[];
}

type Errors = Partial<Record<"name" | "department_id" | "steps", string>> & { stepErrors?: Record<number, string> };

const FORM_ID = "form-modelo-processo";

interface TemplateFormProps {
  /** Modelo em edição; ausente = novo modelo. */
  template?: ProcessTemplate;
  departments: Department[];
  onClose: () => void;
  onSaved: (template: ProcessTemplate) => void;
}

export function TemplateForm({ template, departments, onClose, onSaved }: TemplateFormProps) {
  const { toast } = useToast();
  const nextKey = useRef(1);
  const draft = (title = "", due_day = "", id?: number): StepDraft => ({ key: nextKey.current++, id, title, due_day });

  const [form, setForm] = useState<FormState>(() => ({
    name: template?.name ?? "",
    description: template?.description ?? "",
    department_id: template ? String(template.department_id) : "",
    due_month_offset: template ? (String(template.due_month_offset) as "0" | "1") : "1",
    steps: template ? template.steps.map((step) => draft(step.title, String(step.due_day), step.id)) : [draft()],
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const setStep = (key: number, patch: Partial<StepDraft>) => {
    setForm((current) => ({ ...current, steps: current.steps.map((step) => (step.key === key ? { ...step, ...patch } : step)) }));
    if (errors.stepErrors?.[key]) setErrors((current) => ({ ...current, stepErrors: { ...current.stepErrors, [key]: "" } }));
  };

  const addStep = () => {
    setForm((current) => ({ ...current, steps: [...current.steps, draft()] }));
    setErrors((current) => ({ ...current, steps: undefined }));
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLInputElement>("li:last-child input")?.focus());
  };

  const removeStep = (key: number) => setForm((current) => ({ ...current, steps: current.steps.filter((step) => step.key !== key) }));

  const validate = (): Errors => {
    const found: Errors = {};
    if (!form.name.trim()) found.name = "Informe o nome do modelo.";
    if (!form.department_id) found.department_id = "Selecione o departamento.";
    if (form.steps.length === 0) found.steps = "Inclua pelo menos uma etapa.";
    const stepErrors: Record<number, string> = {};
    for (const step of form.steps) {
      const day = Number(step.due_day);
      if (!step.title.trim()) stepErrors[step.key] = "Informe o nome da etapa.";
      else if (!Number.isInteger(day) || day < 1 || day > 31) stepErrors[step.key] = "O dia do prazo vai de 1 a 31.";
    }
    if (Object.keys(stepErrors).length) found.stepErrors = stepErrors;
    return found;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    const firstField = (["name", "department_id"] as const).find((key) => found[key]);
    if (firstField) {
      document.querySelector<HTMLElement>(`#${FORM_ID} [name="${firstField}"]`)?.focus();
      return;
    }
    if (found.steps || found.stepErrors) {
      const key = found.stepErrors ? Object.keys(found.stepErrors)[0] : undefined;
      document.querySelector<HTMLElement>(key ? `#${FORM_ID} [data-step="${key}"]` : `#${FORM_ID} [data-add-step]`)?.focus();
      return;
    }
    setSubmitting(true);
    const input = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      department_id: Number(form.department_id),
      due_month_offset: Number(form.due_month_offset) as 0 | 1,
      steps: form.steps.map((step) => ({ id: step.id, title: step.title.trim(), due_day: Number(step.due_day) })),
    };
    try {
      const saved = template ? await updateTemplate(template.id, input) : await createTemplate(input);
      toast({ tone: "success", title: template ? "Modelo atualizado" : "Modelo criado", description: saved.name });
      onSaved(saved);
    } catch (error) {
      toast({ tone: "error", title: "Não foi possível salvar o modelo", description: (error as Error).message });
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      dismissible={!submitting}
      title={template ? "Editar modelo" : "Novo modelo de processo"}
      description={template ? "As alterações valem para os próximos processos; os já iniciados não mudam." : "Defina as etapas de uma rotina mensal e o dia de prazo de cada uma."}
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={submitting}>
            {template ? "Salvar alterações" : "Criar modelo"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={submit} className="space-y-5">
        <Field label="Nome" error={errors.name}>
          {(control) => (
            <Input {...control} name="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Fechamento fiscal mensal" data-autofocus />
          )}
        </Field>
        <Field label="Descrição" optional>
          {(control) => <Textarea {...control} name="description" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Departamento" error={errors.department_id}>
            {(control) => (
              <Select {...control} name="department_id" value={form.department_id} onChange={(e) => set("department_id", e.target.value)}>
                <option value="">Selecione</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Prazos das etapas" hint="Obrigações mensais costumam vencer no mês seguinte à competência.">
            {(control) => (
              <Select {...control} name="due_month_offset" value={form.due_month_offset} onChange={(e) => set("due_month_offset", e.target.value as "0" | "1")}>
                <option value="1">{dueMonthLabel[1]}</option>
                <option value="0">{dueMonthLabel[0]}</option>
              </Select>
            )}
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1 text-sm font-medium text-fg">Etapas</legend>
          <p className="mb-3 text-sm text-fg-muted">Cada etapa vira uma tarefa. Ao salvar, elas são ordenadas pelo dia do prazo.</p>
          {form.steps.length > 0 && (
            <div className="mb-1.5 grid grid-cols-[1.25rem_1fr_4.5rem_2rem] gap-2 px-0.5 text-xs text-fg-muted" aria-hidden>
              <span />
              <span>Etapa</span>
              <span>Dia</span>
              <span />
            </div>
          )}
          <ol ref={listRef} className="space-y-2">
            {form.steps.map((step, index) => {
              const error = errors.stepErrors?.[step.key];
              return (
                <li key={step.key}>
                  <div className="grid grid-cols-[1.25rem_1fr_4.5rem_2rem] items-center gap-2">
                    <span className="text-right text-xs tabular-nums text-fg-subtle">{index + 1}</span>
                    <Input
                      size="sm"
                      data-step={step.key}
                      aria-label={`Nome da etapa ${index + 1}`}
                      aria-invalid={Boolean(error && !step.title.trim())}
                      value={step.title}
                      onChange={(e) => setStep(step.key, { title: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addStep();
                        }
                      }}
                      placeholder="Ex.: Apurar impostos"
                    />
                    <Input
                      size="sm"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={31}
                      aria-label={`Dia do prazo da etapa ${index + 1}`}
                      aria-invalid={Boolean(error && step.title.trim())}
                      value={step.due_day}
                      onChange={(e) => setStep(step.key, { due_day: e.target.value })}
                      placeholder="15"
                      className="tabular-nums"
                    />
                    <IconButton size="sm" label={`Remover etapa ${index + 1}`} icon={<X size={14} />} onClick={() => removeStep(step.key)} />
                  </div>
                  {error && <p className="ml-7 mt-1 text-xs text-danger">{error}</p>}
                </li>
              );
            })}
          </ol>
          {errors.steps && <p className="mt-1 text-xs text-danger">{errors.steps}</p>}
          <Button size="sm" variant="ghost" data-add-step className="ml-5 mt-2" leadingIcon={<Plus size={14} aria-hidden />} onClick={addStep}>
            Adicionar etapa
          </Button>
        </fieldset>
      </form>
    </Sheet>
  );
}
