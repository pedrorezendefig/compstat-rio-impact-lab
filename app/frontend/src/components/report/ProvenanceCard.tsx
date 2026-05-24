// ProvenanceCard — o foco do produto. Transparência da IA em linguagem de negócio.
// "Como a IA chegou aqui": racional + confiança + fontes + avisos + detalhe técnico
// recolhido. NUNCA exibe SQL/JSON/prompt.
import { useState } from 'react'
import type { Provenance } from '../../api/types'
import { ConfidenceBadge } from './ConfidenceBadge'
import { SourceCitation } from './SourceCitation'

export function ProvenanceCard({ provenance }: { provenance: Provenance }) {
  const [showTech, setShowTech] = useState(false)
  const { rationale, confidence, sources, warnings, technicalDetail } = provenance

  return (
    <section className="prov" aria-label="Como a IA chegou aqui">
      <header className="prov__head">
        <span className="prov__title">
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Como a IA chegou aqui
        </span>
        <ConfidenceBadge level={confidence} />
      </header>

      <p className="prov__rationale">{rationale}</p>

      {sources.length > 0 && (
        <div className="prov__sources">
          <span className="prov__label">Fontes</span>
          <div className="prov__sources-list">
            {sources.map((s, i) => (
              <SourceCitation key={`${s.kind}-${s.docId ?? i}`} c={s} />
            ))}
          </div>
        </div>
      )}

      {warnings && warnings.length > 0 && (
        <div className="prov__warnings" role="note">
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <span className="prov__warn-label">Atenção</span>
            <ul>
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {technicalDetail && (
        <div className="prov__tech">
          <button
            type="button"
            className="prov__tech-toggle"
            aria-expanded={showTech}
            onClick={() => setShowTech((v) => !v)}
          >
            <svg
              className={`icon prov__chev ${showTech ? 'open' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Ver detalhe técnico
          </button>
          {showTech && <p className="prov__tech-body">{technicalDetail}</p>}
        </div>
      )}
    </section>
  )
}
