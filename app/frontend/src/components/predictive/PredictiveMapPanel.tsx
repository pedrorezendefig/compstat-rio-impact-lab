// Painel do mapa: seletor de área + iframe com o mapa de risco preditivo.
// O mapa "Todas as áreas" é interativo (filtros embutidos); os demais são
// recortes por área no horizonte T+1.
import type { AreaMapa } from './types'
import { MAPA_GERAL, MAPAS_POR_AREA, mapaUrl } from './predictiveMaps'

const OPCOES: AreaMapa[] = [MAPA_GERAL, ...MAPAS_POR_AREA]

export function PredictiveMapPanel({
  selected,
  onSelect,
}: {
  selected: AreaMapa
  onSelect: (m: AreaMapa) => void
}) {
  const handleChange = (arquivo: string) => {
    const found = OPCOES.find((m) => m.arquivo === arquivo)
    if (found) onSelect(found)
  }

  return (
    <div className="pred-map">
      <div className="pred-map__bar">
        <label className="pred-map__label" htmlFor="pred-map-select">
          Área
        </label>
        <select
          id="pred-map-select"
          className="pred-map__select"
          value={selected.arquivo}
          onChange={(e) => handleChange(e.target.value)}
        >
          {OPCOES.map((m) => (
            <option key={m.arquivo} value={m.arquivo}>
              {m.nome}
            </option>
          ))}
        </select>
      </div>

      <iframe
        key={selected.arquivo}
        className="pred-iframe"
        src={mapaUrl(selected)}
        title={selected.nome}
        loading="lazy"
      />

      <p className="pred-map__hint">
        Selecione uma área para ver o mapa de risco detalhado; “Todas as áreas” traz os filtros de
        horizonte e área embutidos.
      </p>
    </div>
  )
}
