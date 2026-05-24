// Severidade operacional da área, derivada do score do match (0–1).
// Usada no cabeçalho do relatório (badge) e onde for útil sinalizar prioridade.
export type Severity = 'alta' | 'media' | 'baixa'

export function severityFromScore(score: number | undefined): Severity {
  if (typeof score !== 'number') return 'baixa'
  if (score >= 0.66) return 'alta'
  if (score >= 0.4) return 'media'
  return 'baixa'
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
}
