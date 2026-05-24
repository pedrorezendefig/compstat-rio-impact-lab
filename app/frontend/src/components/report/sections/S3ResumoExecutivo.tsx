// Seção 3 — Resumo Executivo. As 4 perguntas norteadoras (o quê / quando /
// onde / como). Cada diagnóstico é um AiBlockView (texto + proveniência).
import { useState } from 'react'
import type { AiBlock, PerguntaNorteadora } from '../../../api/types'
import { AiBlockView } from '../AiBlockView'
import { SectionCard } from '../SectionCard'

export function S3ResumoExecutivo({
  perguntas,
  index,
}: {
  perguntas: PerguntaNorteadora[]
  index: number
}) {
  const [local, setLocal] = useState(perguntas)

  function onBlockChange(qid: string, next: AiBlock) {
    setLocal((prev) => prev.map((p) => (p.id === qid ? { ...p, diagnostico: next } : p)))
  }

  return (
    <SectionCard
      index={index}
      id="section-resumo"
      title="Resumo executivo"
      subtitle="Perguntas norteadoras e diagnóstico"
    >
      <div className="resumo">
        <div className="resumo__header" aria-hidden="true">
          <span>Pergunta</span>
          <span>Diagnóstico</span>
          <span>Operação sugerida</span>
        </div>
        {local.map((p) => (
          <div className="resumo__row" key={p.id}>
            <div className="resumo__q">
              <h3>{p.pergunta}</h3>
            </div>
            <div className="resumo__diag">
              <AiBlockView block={p.diagnostico} secao="resumo" onChange={(next) => onBlockChange(p.id, next)} />
            </div>
            <div className="resumo__op">
              <p className="resumo__op-text">{p.operacao}</p>
              {p.observacoes && <p className="resumo__obs meta">{p.observacoes}</p>}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
