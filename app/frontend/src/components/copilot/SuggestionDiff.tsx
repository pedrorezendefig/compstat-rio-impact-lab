// Sugestão do copiloto: diff entre texto atual e proposto, proveniência e
// botões Aceitar / Ajustar / Rejeitar. "Aceitar" aplica via applySuggestion.
import { useMemo, useState } from 'react'
import type { Provenance } from '../../api/types'
import { ProvenanceCard } from '../report/ProvenanceCard'

const SECTION_LABEL: Record<string, string> = {
  identificacao: '01 · Identificação',
  resumo: '03 · Resumo Executivo',
  ocorrencias: '04 · Ocorrências',
  temporal: '05 · Análise Temporal',
  dinamica: '06 · Dinâmica Criminal',
  efetivo: '07 · Efetivo da FM',
  fatores: '08 · Fatores Urbanos',
  cameras: '09 · Câmeras',
  coincidencias: '10 · Coincidências e Plano de Ação',
}

interface Token {
  text: string
  type: 'same' | 'add' | 'del'
}

// diff de palavras simples (LCS) — suficiente para textos curtos do protótipo
function wordDiff(a: string, b: string): { del: Token[]; add: Token[] } {
  const A = a.split(/(\s+)/)
  const B = b.split(/(\s+)/)
  const n = A.length
  const m = B.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])

  const del: Token[] = []
  const add: Token[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      del.push({ text: A[i], type: 'same' })
      add.push({ text: B[j], type: 'same' })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      del.push({ text: A[i], type: 'del' })
      i++
    } else {
      add.push({ text: B[j], type: 'add' })
      j++
    }
  }
  while (i < n) del.push({ text: A[i++], type: 'del' })
  while (j < m) add.push({ text: B[j++], type: 'add' })
  return { del, add }
}

function Tokens({ tokens }: { tokens: Token[] }) {
  return (
    <>
      {tokens.map((t, i) =>
        t.type === 'same' ? (
          <span key={i}>{t.text}</span>
        ) : (
          <span key={i} className={t.type === 'add' ? 'diff-add' : 'diff-del'}>
            {t.text}
          </span>
        ),
      )}
    </>
  )
}

export function SuggestionDiff({
  sectionId,
  currentText,
  proposedText,
  provenance,
  onAccept,
}: {
  sectionId: string
  blockId: string
  currentText: string
  proposedText: string
  provenance: Provenance
  onAccept: (finalText: string) => Promise<void> | void
}) {
  const [state, setState] = useState<'open' | 'editing' | 'accepted' | 'rejected'>('open')
  const [draft, setDraft] = useState(proposedText)
  const diff = useMemo(() => wordDiff(currentText, proposedText), [currentText, proposedText])

  if (state === 'rejected') {
    return <div className="suggestion suggestion--closed">Sugestão dispensada.</div>
  }
  if (state === 'accepted') {
    return (
      <div className="suggestion suggestion--accepted">
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Sugestão aplicada à seção {SECTION_LABEL[sectionId] ?? sectionId}.
      </div>
    )
  }

  return (
    <div className="suggestion">
      <header className="suggestion__head">
        <span className="suggestion__badge">Sugestão</span>
        <span className="suggestion__target">para: {SECTION_LABEL[sectionId] ?? sectionId}</span>
      </header>

      {state === 'editing' ? (
        <textarea
          className="field-textarea suggestion__edit"
          rows={4}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Ajustar texto sugerido"
        />
      ) : (
        <div className="suggestion__diff">
          <div className="suggestion__diff-col">
            <span className="suggestion__diff-label">Atual</span>
            <p className="suggestion__diff-text">
              <Tokens tokens={diff.del} />
            </p>
          </div>
          <div className="suggestion__diff-col">
            <span className="suggestion__diff-label">Proposto</span>
            <p className="suggestion__diff-text">
              <Tokens tokens={diff.add} />
            </p>
          </div>
        </div>
      )}

      <ProvenanceCard provenance={provenance} />

      <div className="suggestion__actions">
        <button
          type="button"
          className="btn btn--ok btn--sm"
          onClick={async () => {
            await onAccept(state === 'editing' ? draft : proposedText)
            setState('accepted')
          }}
        >
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Aceitar
        </button>
        {state === 'editing' ? (
          <button type="button" className="btn btn--sm" onClick={() => setState('open')}>
            Ver diff
          </button>
        ) : (
          <button type="button" className="btn btn--sm" onClick={() => setState('editing')}>
            Ajustar
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setState('rejected')}>
          Rejeitar
        </button>
      </div>
    </div>
  )
}
