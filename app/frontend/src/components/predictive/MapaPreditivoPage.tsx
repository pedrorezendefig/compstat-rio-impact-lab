// Aba "Mapa Preditivo de Risco": à esquerda o mapa (iframe) com seletor de área,
// à direita o painel analítico em abas (drivers / métricas / coeficientes).
import '../../styles/predictive.css'
import { useState } from 'react'
import type { AreaMapa } from './types'
import { MAPA_GERAL } from './predictiveMaps'
import { PredictiveMapPanel } from './PredictiveMapPanel'
import { DriversTable } from './DriversTable'
import { ValidationMetrics } from './ValidationMetrics'
import { CoefficientsTable } from './CoefficientsTable'

type Tab = 'drivers' | 'metricas' | 'coeficientes'

const TABS: { id: Tab; label: string }[] = [
  { id: 'drivers', label: 'Drivers' },
  { id: 'metricas', label: 'Métricas' },
  { id: 'coeficientes', label: 'Coeficientes' },
]

export function MapaPreditivoPage({ onGoHome }: { onGoHome: () => void }) {
  const [selected, setSelected] = useState<AreaMapa>(MAPA_GERAL)
  const [tab, setTab] = useState<Tab>('drivers')

  const filtroArea = selected.arquivo === MAPA_GERAL.arquivo ? undefined : selected.nome

  return (
    <div className="pred-page">
      <header className="pred-header">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onGoHome}>
          ← Panorama
        </button>
        <div className="pred-header__title">
          <strong>Mapa Preditivo de Risco</strong>
          <span className="pred-header__sub">
            Modelo logístico · horizontes T+1/T+2/T+4 · hexágonos H3
          </span>
        </div>
      </header>

      <div className="pred-layout">
        <section className="pred-map-col">
          <PredictiveMapPanel selected={selected} onSelect={setSelected} />
        </section>

        <aside className="pred-sidebar">
          <div className="pred-tabs" role="tablist" aria-label="Painel analítico">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`pred-tab ${tab === t.id ? 'pred-tab--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="pred-sidebar__body">
            {tab === 'drivers' && <DriversTable filtroArea={filtroArea} />}
            {tab === 'metricas' && <ValidationMetrics />}
            {tab === 'coeficientes' && <CoefficientsTable />}
          </div>
        </aside>
      </div>
    </div>
  )
}
