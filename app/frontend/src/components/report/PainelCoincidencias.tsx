// Painel de Coincidências ("bingo"): trechos onde mancha + fator + dinâmica +
// lacuna de câmera se sobrepõem. Cada item mostra score, camadas que bateram,
// fatores próximos, cobertura e a proveniência detalhada.
import { useState } from 'react'
import type { CamadaMatch, Coincidencia, MatchResult } from '../../api/types'
import { focusOnMap } from '../map/mapBus'
import { ConfidenceBadge } from './ConfidenceBadge'
import { ProvenanceCard } from './ProvenanceCard'

const CAMADA_LABEL: Record<CamadaMatch, string> = {
  mancha: 'Mancha criminal',
  fator: 'Fator urbano',
  dinamica: 'Dinâmica criminal',
  lacuna_camera: 'Lacuna de câmera',
}
const ALL_CAMADAS: CamadaMatch[] = ['mancha', 'fator', 'dinamica', 'lacuna_camera']

function scoreClass(score: number): string {
  if (score >= 0.75) return 'is-high'
  if (score >= 0.55) return 'is-mid'
  if (score >= 0.4) return 'is-low'
  return 'is-min'
}

function CoincItem({ c, rank }: { c: Coincidencia; rank: number }) {
  const [open, setOpen] = useState(rank === 1)
  const set = new Set(c.camadas)

  return (
    <li className={`coinc ${scoreClass(c.score)}`}>
      <button
        type="button"
        className="coinc__head"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="coinc__rank" aria-hidden="true">
          {rank}
        </span>
        <span className="coinc__score" aria-label={`score ${c.score.toFixed(2)}`}>
          <span className="coinc__score-val tnum">{c.score.toFixed(2)}</span>
          <span className="coinc__score-cap">score</span>
        </span>
        <span className="coinc__just">{c.justificativa}</span>
        <span className="coinc__meta">
          {c.cobertura.lacuna && <span className="chip chip--alert">sem câmera</span>}
          {c.faccao && <span className="chip chip--neutral">{c.faccao}</span>}
          <svg
            className={`icon coinc__chev ${open ? 'open' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* camadas que coincidiram (todas listadas; ativas em destaque) */}
      <div className="coinc__layers" aria-label="Camadas que coincidem">
        {ALL_CAMADAS.map((cam) => (
          <span key={cam} className={`coinc__layer ${set.has(cam) ? 'on' : ''}`}>
            <span className="coinc__layer-dot" aria-hidden="true" />
            {CAMADA_LABEL[cam]}
          </span>
        ))}
      </div>

      {open && (
        <div className="coinc__body">
          <div className="coinc__facts">
            <div className="coinc__fact">
              <span className="coinc__fact-label">Ocorrências no trecho</span>
              <span className="coinc__fact-value tnum">{c.nOcorrencias.toLocaleString('pt-BR')}</span>
            </div>
            <div className="coinc__fact">
              <span className="coinc__fact-label">Câmeras no raio</span>
              <span className="coinc__fact-value tnum">{c.cobertura.camerasRaio}</span>
            </div>
            <div className="coinc__fact coinc__fact--badge">
              <span className="coinc__fact-label">Confiança</span>
              <ConfidenceBadge level={c.provenance.confidence} compact />
            </div>
          </div>

          {c.fatores.length > 0 && (
            <div className="coinc__factors">
              <span className="coinc__fact-label">Fatores próximos</span>
              <ul>
                {c.fatores.map((f, i) => (
                  <li key={i}>
                    <span className="chip chip--org">{f.orgao ?? 'órgão'}</span>
                    {f.category}
                    <span className="meta"> · {f.dist_m} m</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="coinc__cta">
            <button type="button" className="btn btn--sm" onClick={() => focusOnMap({ lat: c.lat, lon: c.lon })}>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              Ver no mapa
            </button>
          </div>

          <ProvenanceCard provenance={c.provenance} />
        </div>
      )}
    </li>
  )
}

export function PainelCoincidencias({ match }: { match: MatchResult }) {
  const ordered = [...match.coincidencias].sort((a, b) => b.score - a.score)

  return (
    <div className="painel">
      <div className="painel__summary panel">
        <div className="painel__score">
          <span className="painel__score-val tnum">{(match.scoreArea * 100).toFixed(0)}</span>
          <span className="painel__score-cap">índice de risco da área (0–100)</span>
        </div>
        <p className="painel__resumo">{match.resumo}</p>
        <div className="painel__camadas">
          {match.camadasArea.map((cam) => (
            <span key={cam} className="chip chip--primary">
              {CAMADA_LABEL[cam as CamadaMatch] ?? cam}
            </span>
          ))}
        </div>
      </div>

      <ol className="painel__list">
        {ordered.map((c, i) => (
          <CoincItem key={c.id} c={c} rank={i + 1} />
        ))}
      </ol>
    </div>
  )
}
