// CopilotChat — painel lateral. Histórico + composer + streaming SSE.
// Consome streamChat (cai para fixtures) e aplica sugestões via applySuggestion.
import { useEffect, useRef, useState } from 'react'
import { streamChat } from '../../api/copilot'
import { useReport } from '../../state/reportContext'
import { ChatMessage } from './ChatMessage'
import type { ChatTurn, SuggestionEntry } from './ChatMessage'
import { Composer } from './Composer'

const STARTERS = [
  'Onde devo concentrar a Força Municipal nesta área?',
  'Qual o melhor horário e modelo de emprego do efetivo?',
  'Quais fatores urbanos priorizar e com quais órgãos?',
]

let turnSeq = 0
const nextId = () => `turn-${++turnSeq}`

export function CopilotChat({ onClose }: { onClose: () => void }) {
  const { areaId, applySuggestion } = useReport()
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns])

  // ao desmontar (ex.: troca de área via key), aborta stream em andamento
  useEffect(() => () => abortRef.current?.abort(), [])

  async function send(message: string) {
    const text = message.trim()
    if (!text || streaming) return
    const userTurn: ChatTurn = { id: nextId(), role: 'user', text, tools: [] }
    const aiId = nextId()
    const aiTurn: ChatTurn = { id: aiId, role: 'assistant', text: '', tools: [], streaming: true }
    setTurns((t) => [...t, userTurn, aiTurn])
    setStreaming(true)

    const update = (fn: (t: ChatTurn) => ChatTurn) =>
      setTurns((prev) => prev.map((t) => (t.id === aiId ? fn(t) : t)))

    const ac = new AbortController()
    abortRef.current = ac
    try {
      for await (const ev of streamChat(areaId, text, ac.signal)) {
        switch (ev.type) {
          case 'tool_call':
            update((t) => ({ ...t, tools: [...t.tools, { label: ev.friendlyLabel, done: false }] }))
            break
          case 'tool_result':
            update((t) => {
              const tools = [...t.tools]
              // marca a última ferramenta pendente como concluída
              for (let i = tools.length - 1; i >= 0; i--) {
                if (!tools[i].done) {
                  tools[i] = { ...tools[i], done: true, recordCount: ev.recordCount }
                  break
                }
              }
              return { ...t, tools }
            })
            break
          case 'text':
            update((t) => ({ ...t, text: t.text + ev.delta }))
            break
          case 'provenance':
            update((t) => ({ ...t, provenance: ev.provenance }))
            break
          case 'suggestion':
            update((t) => ({
              ...t,
              suggestion: {
                sectionId: ev.sectionId,
                blockId: ev.blockId,
                currentText: ev.currentText,
                proposedText: ev.proposedText,
                provenance: ev.provenance,
              },
            }))
            break
          case 'error':
            update((t) => ({ ...t, error: ev.message, streaming: false }))
            break
          case 'done':
            update((t) => ({ ...t, streaming: false }))
            break
        }
      }
    } catch {
      update((t) => ({ ...t, error: 'Não foi possível concluir a resposta.', streaming: false }))
    } finally {
      update((t) => ({ ...t, streaming: false }))
      setStreaming(false)
      abortRef.current = null
    }
  }

  async function acceptSuggestion(s: SuggestionEntry, finalText: string) {
    await applySuggestion(s.sectionId, s.blockId, finalText)
  }

  return (
    <aside className="copilot" aria-label="Copiloto de análise">
      <header className="copilot__head">
        <div className="copilot__title">
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
          </svg>
          <div>
            <strong>Copiloto</strong>
            <span className="copilot__sub">pergunte sobre a área e o relatório</span>
          </div>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Fechar copiloto">
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <div className="copilot__scroll" ref={scrollRef}>
        {turns.length === 0 ? (
          <div className="copilot__empty">
            <p className="copilot__empty-title">Como posso ajudar nesta área?</p>
            <p className="muted">
              Eu cruzo a mancha criminal, os fatores urbanos e a inteligência. Toda resposta vem com a fonte e o
              nível de confiança.
            </p>
            <div className="copilot__starters">
              {STARTERS.map((s) => (
                <button key={s} type="button" className="copilot__starter" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((t) => <ChatMessage key={t.id} turn={t} onAcceptSuggestion={acceptSuggestion} />)
        )}
      </div>

      <Composer disabled={streaming} onSend={send} />
    </aside>
  )
}
