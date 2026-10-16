/** Competência no formato "MM/AAAA" — o mês de referência de uma rotina contábil. */

const pad = (value: number) => String(value).padStart(2, "0");

export function parseCompetence(competence: string): { month: number; year: number } {
  const [month, year] = competence.split("/").map(Number);
  return { month, year };
}

/** Competência anterior à data: em outubro, o escritório fecha setembro. */
export function previousCompetence(now: Date = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Valor numérico para ordenar competências (mais recente = maior). */
export function competenceKey(competence: string): number {
  const { month, year } = parseCompetence(competence);
  return year * 12 + month;
}

/**
 * Prazo de uma etapa: dia `day` do mês da competência (offset 0) ou do mês seguinte (offset 1),
 * limitado ao último dia do mês (dia 31 em novembro vira 30), às 18:00.
 */
export function competenceDueDate(competence: string, offset: 0 | 1, day: number): Date {
  const { month, year } = parseCompetence(competence);
  const target = new Date(year, month - 1 + offset, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(Math.max(day, 1), lastDay));
  target.setHours(18, 0, 0, 0);
  return target;
}
