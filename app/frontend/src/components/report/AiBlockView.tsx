// AiBlockView — texto do bloco de IA + ProvenanceCard + regenerar.
// Estados não-gerados (dados_indisponiveis/erro/nao_gerado) mostram um vazio
// amigável que ensina o próximo passo, com botão "gerar".
import { useState } from 'react'
import type { AiBlock } from '../../api/types'
import { useReport } from '../../state/reportContext'
import { ProvenanceCard } from './ProvenanceCard'

const EMPTY_COPY: Record<string, { title: string; body: string; cta: string }> = {
  dados_indisponiveis: {
    title: 'Dados insuficientes para esta análise',
    body: 'Não há registros suficientes nesta área e período para a IA sintetizar com segurança. Reúna mais dados ou ajuste o período e gere novamente.',
    cta: 'Tentar gerar',
  },
  erro: {
    title: 'A geração falhou',
    body: 'Ocorreu um problema ao produzir esta análise. Você pode tentar gerar novamente.',
    cta: 'Gerar novamente',
  },
  nao_gerado: {
    title: 'Análise ainda não gerada',
    body: 'Este bloco será preenchido pela IA a partir dos dados da área. Gere quando quiser.',
    cta: 'Gerar análise',
  },
}

export function AiBlockView({
  block,
  secao,
  onChange,
}: {
  block: AiBlock
  secao: string
  /** Recebe o bloco regenerado para o chamador atualizar seu estado. */
  onChange?: (next: AiBlock) => void
}) {
  const { regenerate } = useReport()
  const [busy, setBusy] = useState(false)
  const [override, setOverride] = useState<AiBlock | null>(null)

  // o pai é a fonte da verdade; override só vale após uma regeneração local
  const view = override ?? block

  async function run() {
    setBusy(true)
    try {
      const next = await regenerate(secao)
      setOverride(next)
      onChange?.(next)
    } finally {
      setBusy(false)
    }
  }

  if (view.status !== 'gerado') {
    const copy = EMPTY_COPY[view.status] ?? EMPTY_COPY.nao_gerado
    return (
      <div className="ai-empty">
        <div className="ai-empty__icon" aria-hidden="true">
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
          </svg>
        </div>
        <div className="ai-empty__text">
          <strong>{copy.title}</strong>
          <p className="muted">{copy.body}</p>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={run} disabled={busy}>
          {busy ? 'Gerando…' : copy.cta}
        </button>
      </div>
    )
  }

  return (
    <div className="ai-block">
      <div className="ai-block__body">
        <p className="ai-block__text">{view.text}</p>
        {view.editedByHuman && (
          <span className="chip ai-block__edited" title="Texto ajustado por uma pessoa">
            editado por humano
          </span>
        )}
      </div>
      {view.provenance && <ProvenanceCard provenance={view.provenance} />}
      <div className="ai-block__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={run} disabled={busy}>
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {busy ? 'Regenerando…' : 'Regenerar'}
        </button>
        {view.geradoEm && (
          <span className="meta">gerado em {new Date(view.geradoEm).toLocaleString('pt-BR')}</span>
        )}
      </div>
    </div>
  )
}
