// Seção 1 — Identificação. Campos administrativos editáveis; demais campos
// derivam dos dados (com proveniência).
import { useState } from 'react'
import type { Identificacao } from '../../../api/types'
import { useReport } from '../../../state/reportContext'
import { ProvenanceCard } from '../ProvenanceCard'
import { SectionCard } from '../SectionCard'

const ADMIN_FIELDS: { key: keyof Identificacao; label: string; placeholder: string }[] = [
  { key: 'aisp', label: 'AISP', placeholder: 'ex.: 5ª AISP' },
  { key: 'dp', label: 'Delegacia (DP)', placeholder: 'ex.: 4ª DP' },
  { key: 'bpm', label: 'Batalhão (BPM)', placeholder: 'ex.: 5º BPM' },
  { key: 'baseFM', label: 'Base da FM', placeholder: 'ex.: Base Central' },
  { key: 'subprefeitura', label: 'Subprefeitura', placeholder: 'ex.: Centro' },
]

export function S1Identificacao({ data, index }: { data: Identificacao; index: number }) {
  const { patchSection } = useReport()
  const [editing, setEditing] = useState(false)

  function setField(key: keyof Identificacao, value: string) {
    patchSection('identificacao', { identificacao: { ...data, [key]: value } }, { [key]: value })
  }

  return (
    <SectionCard
      index={index}
      id="section-identificacao"
      title="Identificação da área"
      subtitle="Dados administrativos e território"
      editing={editing}
      onToggleEdit={() => setEditing((v) => !v)}
    >
      <dl className="idgrid">
        <div className="idgrid__item idgrid__item--wide">
          <dt>Área da FM</dt>
          <dd className="tnum">
            {String(data.areaFM).padStart(2, '0')} — {data.nomeArea}
          </dd>
        </div>
        <div className="idgrid__item idgrid__item--wide">
          <dt>Bairros</dt>
          <dd>{data.bairros.join(', ')}</dd>
        </div>

        {ADMIN_FIELDS.map((f) => {
          const value = (data[f.key] as string) ?? ''
          return (
            <div className="idgrid__item" key={f.key}>
              <dt>{f.label}</dt>
              <dd>
                {editing ? (
                  <input
                    className="field-input"
                    value={value}
                    placeholder={f.placeholder}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                ) : value ? (
                  <span>{value}</span>
                ) : (
                  <span className="cell-empty">a preencher</span>
                )}
              </dd>
            </div>
          )
        })}

        <div className="idgrid__item idgrid__item--wide">
          <dt>Grupo criminoso de influência</dt>
          <dd className="idgrid__tags">
            {data.influenciaGrupoCriminoso.map((g) => (
              <span key={g} className="chip chip--neutral">
                {g}
              </span>
            ))}
          </dd>
        </div>
        {typeof data.trechosCriticos === 'number' && (
          <div className="idgrid__item">
            <dt>Trechos críticos</dt>
            <dd className="tnum idgrid__big">{data.trechosCriticos}</dd>
          </div>
        )}
      </dl>

      <ProvenanceCard provenance={data.provenance} />
    </SectionCard>
  )
}
