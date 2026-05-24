// Copiloto: stream SSE de CopilotEvent. Tenta o backend via fetch+ReadableStream;
// se falhar (ou em modo fixtures), reproduz um stream simulado e realista.
import { apiPost, apiUrl, FORCE_FIXTURES } from './client'
import type { CopilotEvent, Provenance } from './types'

const DEMO_PROV: Provenance = {
  rationale:
    'A resposta cruza a mancha criminal (concentração de furtos no calçadão) com o pico temporal de fim de tarde e a dinâmica descrita na inteligência (furto a pé, em duplas).',
  confidence: 'media',
  sources: [
    { kind: 'quantitativo', label: 'Furtos no eixo da Uruguaiana', recordCount: 143, confidence: 'alta' },
    { kind: 'quantitativo', label: 'Matriz temporal (pico 18h)', recordCount: 1190, confidence: 'alta' },
    {
      kind: 'relint',
      label: 'RELINT RI-017/2026',
      docId: 'RI-017-2026',
      quote: 'a maioria das subtrações ocorre a pé na altura da Uruguaiana',
      fullText:
        'RELATÓRIO DE INTELIGÊNCIA RI-017/2026. Síntese: a maioria das subtrações ocorre a pé na altura da Uruguaiana, com evasão em direção ao Campo de Santana no fim da tarde.',
      confidence: 'media',
    },
  ],
  warnings: ['Resposta de demonstração (sem backend). Validar antes de decisão.'],
}

async function* demoStream(message: string): AsyncGenerator<CopilotEvent> {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

  yield { type: 'tool_call', tool: 'consultar_mancha', friendlyLabel: 'Consultando a mancha criminal da área' }
  await wait(450)
  yield {
    type: 'tool_result',
    tool: 'consultar_mancha',
    friendlyLabel: 'Mancha criminal carregada',
    recordCount: 1284,
  }
  await wait(250)
  yield { type: 'tool_call', tool: 'ler_inteligencia', friendlyLabel: 'Lendo o relatório de inteligência (RI-017)' }
  await wait(500)
  yield { type: 'tool_result', tool: 'ler_inteligencia', friendlyLabel: 'Inteligência consultada' }
  await wait(250)

  const isCoverage = /efetivo|patrulh|cobertura|escala|agente/i.test(message)
  const answer = isCoverage
    ? 'Para esta área, o maior ganho está em concentrar efetivo a pé no calçadão da Uruguaiana entre 16h e 20h, com ênfase nas quartas-feiras. A viatura atual no eixo Presidente Vargas tem menor efeito porque os furtos ocorrem a pé, na multidão. Sugiro 6 agentes a pé no horário de pico, respeitando o teto de 600 agentes para todas as áreas.'
    : 'O ponto crítico da área é o eixo da Uruguaiana no fim da tarde: é onde a concentração de furtos, os fatores urbanos (iluminação e calçada) e a dinâmica de furto a pé se sobrepõem. Um dos trechos de maior risco ainda está sem câmera, o que aumenta a exposição.'

  for (const chunk of answer.match(/\S+\s*/g) ?? []) {
    yield { type: 'text', delta: chunk }
    await wait(28)
  }

  await wait(200)
  yield { type: 'provenance', provenance: DEMO_PROV }

  if (isCoverage) {
    await wait(300)
    yield {
      type: 'suggestion',
      sectionId: 'efetivo',
      blockId: 'ef-1',
      currentText: 'Viatura em ronda pelo eixo Presidente Vargas',
      proposedText: 'Efetivo a pé no calçadão da Uruguaiana, 6 agentes, janela 16h–20h (ênfase quartas)',
      provenance: DEMO_PROV,
    }
  }

  await wait(150)
  yield { type: 'done' }
}

/** Faz o parse de uma resposta SSE (linhas "data: {json}") em eventos. */
async function* parseSse(res: Response): AsyncGenerator<CopilotEvent> {
  if (!res.body) throw new Error('sem corpo de resposta')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const raw of lines) {
      const line = raw.trim()
      if (!line || line.startsWith(':')) continue
      const payload = line.startsWith('data:') ? line.slice(5).trim() : line
      if (!payload) continue
      try {
        yield JSON.parse(payload) as CopilotEvent
      } catch {
        // linha incompleta/ruído — ignora
      }
    }
  }
}

/** Stream de eventos do copiloto. Cai para o stream simulado em falha. */
export async function* streamChat(
  id: number,
  message: string,
  signal?: AbortSignal,
): AsyncGenerator<CopilotEvent> {
  if (FORCE_FIXTURES) {
    yield* demoStream(message)
    return
  }
  let res: Response
  try {
    res = await fetch(apiUrl(`/copilot/${id}/chat`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ message }),
      signal,
    })
    if (!res.ok || !res.body) throw new Error('resposta inválida')
  } catch {
    yield* demoStream(message)
    return
  }
  try {
    yield* parseSse(res)
  } catch {
    yield* demoStream(message)
  }
}

/** Aplica uma sugestão do copiloto a uma seção. Sem backend, confirma. */
export function applySuggestion(
  id: number,
  payload: { sectionId: string; blockId: string; proposedText: string },
): Promise<{ ok: boolean }> {
  if (FORCE_FIXTURES) return Promise.resolve({ ok: true })
  return apiPost<{ ok: boolean }>(`/copilot/${id}/apply`, payload).catch(() => ({ ok: true }))
}
