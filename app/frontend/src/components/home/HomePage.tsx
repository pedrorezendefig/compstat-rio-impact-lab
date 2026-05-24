// Página inicial: panorama das áreas da Força Municipal, em cards ordenados
// por urgência (volume de ocorrências). Clicar num card abre o relatório.
import { useQuery } from '@tanstack/react-query'
import { fetchAreasOverview } from '../../api/reports'
import { AreaCard } from './AreaCard'

export function HomePage({ onSelectArea, onOpenPredictive }: { onSelectArea: (id: number) => void; onOpenPredictive: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['areas-overview'],
    queryFn: fetchAreasOverview,
    staleTime: 5 * 60 * 1000,
  })

  const areas = [...(data ?? [])].sort((a, b) => a.ranking - b.ranking)

  return (
    <div className="home">
      <header className="home__topbar">
        <span className="home__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </span>
        <div className="home__brand">
          <strong>CompStat Rio</strong>
          <span className="home__brand-sub">Inteligência de Segurança Pública</span>
        </div>
        <button type="button" className="btn btn--primary" style={{ marginLeft: 'auto' }} onClick={onOpenPredictive}>
          Mapa Preditivo de Risco
        </button>
      </header>

      <main className="home__body">
        <div className="home__intro">
          <span className="home__eyebrow">Força Municipal · Panorama operacional</span>
          <h1 className="home__title">Áreas priorizadas por urgência</h1>
          <p className="home__subtitle">
            As {areas.length || 8} áreas da Força Municipal, ordenadas pelo volume de ocorrências
            de roubo e furto no período. Selecione uma área para abrir o relatório analítico completo.
          </p>
        </div>

        {isLoading ? (
          <ul className="area-grid" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i}>
                <div className="area-card area-card--skeleton" aria-hidden="true" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="area-grid">
            {areas.map((a) => (
              <li key={a.areaId}>
                <AreaCard area={a} onSelect={onSelectArea} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
