// Seção 9 — Câmeras. Total de câmeras na área e proveniência (inclui a leitura
// de lacunas, exploradas no painel de coincidências).
import type { Cameras } from '../../../api/types'
import { ProvenanceCard } from '../ProvenanceCard'
import { SectionCard } from '../SectionCard'

export function S9Cameras({ data, index }: { data: Cameras; index: number }) {
  return (
    <SectionCard
      index={index}
      id="section-cameras"
      title="Cobertura de câmeras"
      subtitle="Vigilância cadastrada na área (CIVITAS / COR)"
    >
      <div className="cameras">
        <div className="cameras__count">
          <svg className="icon cameras__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" />
          </svg>
          <div>
            <span className="cameras__value tnum">{data.total}</span>
            <span className="cameras__label">câmeras ativas na área</span>
          </div>
        </div>
        <p className="cameras__hint muted">
          Trechos com crime e sem câmera no raio aparecem como lacuna no painel de coincidências (Seção 10).
        </p>
      </div>
      <ProvenanceCard provenance={data.provenance} />
    </SectionCard>
  )
}
