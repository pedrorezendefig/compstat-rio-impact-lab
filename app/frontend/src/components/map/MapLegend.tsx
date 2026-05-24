// Legenda + toggles de camadas do mapa.
export interface LayerToggles {
  occurrences: boolean
  cameras: boolean
  urbanFactors: boolean
  criticalSegments: boolean
}

export type LayerKey = keyof LayerToggles

const ITEMS: { key: LayerKey; label: string; swatch: 'heat' | 'camera' | 'factor' | 'critical' }[] = [
  { key: 'occurrences', label: 'Mancha de ocorrências', swatch: 'heat' },
  { key: 'criticalSegments', label: 'Trechos críticos (por score)', swatch: 'critical' },
  { key: 'urbanFactors', label: 'Fatores urbanos', swatch: 'factor' },
  { key: 'cameras', label: 'Câmeras', swatch: 'camera' },
]

export function MapLegend({
  toggles,
  onToggle,
}: {
  toggles: LayerToggles
  onToggle: (key: LayerKey) => void
}) {
  return (
    <div className="map-legend panel">
      <span className="map-legend__title">Camadas</span>
      <ul className="map-legend__list">
        {ITEMS.map((it) => (
          <li key={it.key}>
            <label className="map-legend__item">
              <input type="checkbox" checked={toggles[it.key]} onChange={() => onToggle(it.key)} />
              <span className={`map-legend__swatch map-legend__swatch--${it.swatch}`} aria-hidden="true" />
              <span>{it.label}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="map-legend__scale">
        <span className="map-legend__scale-label">Score do trecho</span>
        <div className="map-legend__scale-bar">
          <span style={{ background: 'var(--heat-2)' }} />
          <span style={{ background: 'var(--heat-3)' }} />
          <span style={{ background: 'var(--heat-4)' }} />
          <span style={{ background: 'var(--heat-5)' }} />
        </div>
        <div className="map-legend__scale-ends">
          <span>menor</span>
          <span>maior</span>
        </div>
      </div>
    </div>
  )
}
