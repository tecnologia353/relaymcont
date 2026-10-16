"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Badge, Button, Checkbox, Field, Input, Select, Sheet, useToast } from "@/components/ui";
import type { Client, Process, ProcessTemplate, User } from "@/lib/api";
import { previousCompetence } from "@/lib/competence";
import { cn } from "@/lib/cn";
import { emit } from "@/lib/events";
import { formatShortDate } from "@/lib/format";
import { COMPETENCE_PATTERN } from "@/features/tasks/task-utils";
import { launchProcesses } from "./processes-api";
import { templateDueRange } from "./process-utils";

const FORM_ID = "form-iniciar-processo";

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface ProcessLaunchProps {
  templates: ProcessTemplate[];
  clients: Client[];
  users: User[];
  processes: Process[];
  initialTemplateId?: number;
  onClose: () => void;
  onLaunched: (competence: string) => void;
}

export function ProcessLaunch({ templates, clients, users, processes, initialTemplateId, onClose, onLaunched }: ProcessLaunchProps) {
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState(initialTemplateId ? String(initialTemplateId) : "");
  const [competence, setCompetence] = useState(previousCompetence());
  const [assigneeId, setAssigneeId] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState<{ template?: string; competence?: string; clients?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const template = templates.find((item) => item.id === Number(templateId));
  const validCompetence = COMPETENCE_PATTERN.test(competence.trim());
  const activeClients = useMemo(() => clients.filter((client) => client.status === "active"), [clients]);

  /** Clientes que já têm este modelo na competência (não geram duplicata). */
  const alreadyStarted = useMemo(() => {
    if (!template || !validCompetence) return new Set<number>();
    return new Set(
      processes
        .filter((process) => process.template_id === template.id && process.competence === competence.trim() && process.status !== "canceled")
        .map((process) => process.client_id),
    );
  }, [processes, template, competence, validCompetence]);

  const available = activeClients.filter((client) => !alreadyStarted.has(client.id));
  const chosen = [...selected].filter((id) => !alreadyStarted.has(id));

  const visible = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return activeClients;
    return activeClients.filter((client) => terms.every((term) => normalize(`${client.trade_name} ${client.legal_name} ${client.tax_regime}`).includes(term)));
  }, [activeClients, query]);

  const allChosen = available.length > 0 && available.every((client) => selected.has(client.id));
  const toggleAll = () => setSelected(allChosen ? new Set() : new Set(available.map((client) => client.id)));
  const toggle = (id: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setErrors((current) => ({ ...current, clients: undefined }));
  };

  const range = template && validCompetence ? templateDueRange(template, competence.trim()) : null;
  const taskCount = template ? chosen.length * template.steps.length : 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: typeof errors = {};
    if (!template) found.template = "Selecione o modelo.";
    if (!validCompetence) found.competence = "Use o formato MM/AAAA, ex.: 09/2026.";
    if (template && validCompetence && chosen.length === 0) found.clients = "Selecione pelo menos um cliente.";
    setErrors(found);
    if (found.template || found.competence) {
      document.querySelector<HTMLElement>(`#${FORM_ID} [name="${found.template ? "template" : "competence"}"]`)?.focus();
      return;
    }
    if (found.clients || !template) return;
    setSubmitting(true);
    try {
      const result = await launchProcesses({
        template_id: template.id,
        competence: competence.trim(),
        client_ids: chosen,
        assignee_id: assigneeId ? Number(assigneeId) : null,
      });
      const count = result.created.length;
      toast({
        tone: "success",
        title: count === 1 ? "1 processo iniciado" : `${count} processos iniciados`,
        description: `${template.name} · ${competence.trim()} · ${count * template.steps.length} tarefas criadas`,
      });
      emit("tasks:changed");
      emit("notifications:changed");
      onLaunched(competence.trim());
    } catch (error) {
      toast({ tone: "error", title: "Não foi possível iniciar o processo", description: (error as Error).message });
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      dismissible={!submitting}
      title="Iniciar processo"
      description="Gera as tarefas de cada etapa para os clientes escolhidos."
      footer={
        <>
          <p className="mr-auto self-center text-sm tabular-nums text-fg-muted" aria-live="polite">
            {taskCount > 0 && `${taskCount} ${taskCount === 1 ? "tarefa" : "tarefas"} serão criadas`}
          </p>
          <Button onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={submitting}>
            Iniciar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={submit} className="space-y-5">
        <Field label="Modelo" error={errors.template}>
          {(control) => (
            <Select
              {...control}
              name="template"
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value);
                setErrors((current) => ({ ...current, template: undefined }));
              }}
              data-autofocus={!initialTemplateId || undefined}
            >
              <option value="">Selecione</option>
              {templates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {template && (
          <div className="rounded-lg border border-line bg-sunken/60 px-3 py-2.5 text-sm">
            <p className="text-fg-muted">
              {template.steps.length} {template.steps.length === 1 ? "etapa" : "etapas"}
              {range && (
                <>
                  {" "}
                  · prazos de <span className="font-medium text-fg">{formatShortDate(range[0])}</span> a{" "}
                  <span className="font-medium text-fg">{formatShortDate(range[1])}</span>
                </>
              )}
            </p>
            <p className="mt-1 truncate text-xs text-fg-subtle">{template.steps.map((step) => step.title).join(" → ")}</p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-[9rem_1fr]">
          <Field label="Competência" error={errors.competence}>
            {(control) => (
              <Input
                {...control}
                name="competence"
                inputMode="numeric"
                value={competence}
                onChange={(e) => {
                  setCompetence(e.target.value);
                  setErrors((current) => ({ ...current, competence: undefined }));
                }}
                placeholder="MM/AAAA"
                className="tabular-nums"
              />
            )}
          </Field>
          <Field label="Responsável">
            {(control) => (
              <Select {...control} name="assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Responsável interno do cliente</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <fieldset>
          <div className="mb-2 flex items-center justify-between gap-2">
            <legend className="text-sm font-medium text-fg">
              Clientes <span className="font-normal tabular-nums text-fg-muted">{chosen.length} de {available.length}</span>
            </legend>
            <Button size="sm" variant="ghost" onClick={toggleAll} disabled={available.length === 0}>
              {allChosen ? "Limpar seleção" : "Selecionar todos"}
            </Button>
          </div>
          <Input
            size="sm"
            type="search"
            aria-label="Filtrar clientes"
            placeholder="Filtrar por nome ou regime"
            leadingIcon={<Search size={14} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2"
          />
          <ul className={cn("thin-scroll max-h-72 divide-y divide-line overflow-y-auto rounded-lg border", errors.clients ? "border-danger" : "border-line")}>
            {visible.map((client) => {
              const started = alreadyStarted.has(client.id);
              return (
                <li key={client.id} className="flex min-h-10 items-center gap-2 px-3 py-1.5">
                  <Checkbox
                    className="min-w-0 flex-1 text-sm"
                    checked={started || selected.has(client.id)}
                    disabled={started}
                    onChange={() => toggle(client.id)}
                    label={
                      <span className="min-w-0 truncate">
                        <span className="text-fg">{client.trade_name}</span>
                        <span className="text-fg-subtle"> · {client.tax_regime}</span>
                      </span>
                    }
                  />
                  {started && <Badge>Já iniciado</Badge>}
                </li>
              );
            })}
            {visible.length === 0 && <li className="px-3 py-6 text-center text-sm text-fg-muted">Nenhum cliente ativo encontrado.</li>}
          </ul>
          {errors.clients && <p className="mt-1 text-xs text-danger">{errors.clients}</p>}
        </fieldset>
      </form>
    </Sheet>
  );
}
