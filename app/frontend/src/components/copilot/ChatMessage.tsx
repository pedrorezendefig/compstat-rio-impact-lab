// Uma mensagem do chat. Usuário (bolha à direita) ou assistente (à esquerda,
// com ferramentas, texto em streaming, proveniência e sugestão).
import type { Provenance } from '../../api/types'
import { ProvenanceCard } from '../report/ProvenanceCard'
import { SuggestionDiff } from './SuggestionDiff'
import { ToolCallChip } from './ToolCallChip'

export interface ToolEntry {
  label: string
  done: boolean
  recordCount?: number
}
export interface SuggestionEntry {
  sectionId: string
  blockId: string
  currentText: string
  proposedText: string
  provenance: Provenance
}
export interface ChatTurn {
  id: string
  role: 'user' | 'assistant'
  text: string
  tools: ToolEntry[]
  provenance?: Provenance
  suggestion?: SuggestionEntry
  streaming?: boolean
  error?: string
}

export function ChatMessage({
  turn,
  onAcceptSuggestion,
}: {
  turn: ChatTurn
  onAcceptSuggestion: (s: SuggestionEntry, finalText: string) => Promise<void> | void
}) {
  if (turn.role === 'user') {
    return (
      <div className="msg msg--user">
        <div className="msg__bubble">{turn.text}</div>
      </div>
    )
  }

  return (
    <div className="msg msg--assistant">
      <div className="msg__avatar" aria-hidden="true">
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>
      <div className="msg__content">
        {turn.tools.length > 0 && (
          <div className="msg__tools">
            {turn.tools.map((t, i) => (
              <ToolCallChip key={i} label={t.label} done={t.done} recordCount={t.recordCount} />
            ))}
          </div>
        )}

        {turn.text && (
          <div className="msg__bubble">
            {turn.text}
            {turn.streaming && <span className="msg__caret" aria-hidden="true" />}
          </div>
        )}

        {turn.error && <div className="msg__error">{turn.error}</div>}

        {turn.provenance && <ProvenanceCard provenance={turn.provenance} />}

        {turn.suggestion && (
          <SuggestionDiff
            sectionId={turn.suggestion.sectionId}
            blockId={turn.suggestion.blockId}
            currentText={turn.suggestion.currentText}
            proposedText={turn.suggestion.proposedText}
            provenance={turn.suggestion.provenance}
            onAccept={(finalText) => onAcceptSuggestion(turn.suggestion!, finalText)}
          />
        )}
      </div>
    </div>
  )
}
