// Seletor de área (dropdown nativo das 8 áreas da FM).
import { AREAS_FM } from '../../api/types'
import { useReport } from '../../state/reportContext'

const ENTRIES = Object.entries(AREAS_FM).map(([id, nome]) => ({ id: Number(id), nome }))

export function AreaSelector() {
  const { areaId, setAreaId } = useReport()
  return (
    <label className="area-selector">
      <span className="area-selector__label">Área da FM</span>
      <div className="area-selector__control">
        <select value={areaId} onChange={(e) => setAreaId(Number(e.target.value))} aria-label="Selecionar área da Força Municipal">
          {ENTRIES.map((a) => (
            <option key={a.id} value={a.id}>
              {String(a.id).padStart(2, '0')} · {a.nome}
            </option>
          ))}
        </select>
        <svg className="icon area-selector__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </label>
  )
}
