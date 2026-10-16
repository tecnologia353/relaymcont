import { api } from "@/lib/api";
import type { Process, ProcessLaunchInput, ProcessLaunchResult, ProcessTemplate, ProcessTemplateInput } from "@/lib/api";

export const fetchTemplates = () => api<ProcessTemplate[]>("/process-templates");

export const createTemplate = (input: ProcessTemplateInput) =>
  api<ProcessTemplate>("/process-templates", { method: "POST", body: JSON.stringify(input) });

export const updateTemplate = (id: number, input: ProcessTemplateInput) =>
  api<ProcessTemplate>(`/process-templates/${id}`, { method: "PATCH", body: JSON.stringify(input) });

export const fetchProcesses = () => api<Process[]>("/processes");

export const launchProcesses = (input: ProcessLaunchInput) =>
  api<ProcessLaunchResult>("/processes", { method: "POST", body: JSON.stringify(input) });

export const cancelProcess = (id: number) =>
  api<Process>(`/processes/${id}`, { method: "PATCH", body: JSON.stringify({ status: "canceled" }) });
