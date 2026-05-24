// Seção 8 — Fatores Urbanos de Incidência. Lista fator -> órgão responsável,
// com proveniência por fator quando disponível e proveniência geral da seção.
import { useState } from 'react'
import type { FatoresIncidencia } from '../../../api/types'
import { ProvenanceCard } from '../ProvenanceCard'
import { SectionCard } from '../SectionCard'

export function S8Fatores({ data, index }: { data: FatoresIncidencia; index: number }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <SectionCard
      index={index}
      id="section-fatores"
      title="Fatores urbanos de incidência"
      subtitle="O que favorece o crime e qual órgão resolve"
    >
      <ul className="factor-list">
        {data.rows.map((f, i) => {
          const open = openIdx === i
          return (
            <li className="factor" key={`${f.fator}-${i}`}>
              <div className="factor__main">
                <div className="factor__head">
                  <span className="factor__name">{f.fator}</span>
                  {f.orgaoResponsavel && <span className="chip chip--org">{f.orgaoResponsavel}</span>}
                  <span className="factor__qtd tnum" title="ocorrências do fator">
                    {f.qtd}×
                  </span>
                </div>
                <p className="factor__desc muted">{f.descricao}</p>
              </div>
              {f.provenance && (
                <div className="factor__prov">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    aria-expanded={open}
                    onClick={() => setOpenIdx(open ? null : i)}
                  >
                    Como a IA chegou aqui
                  </button>
                  {open && <ProvenanceCard provenance={f.provenance} />}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <ProvenanceCard provenance={data.provenance} />
    </SectionCard>
  )
}
