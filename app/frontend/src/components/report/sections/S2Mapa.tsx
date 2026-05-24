// Seção 2 — Mapa. Carrega o pacote GeoJSON da área e renderiza o HotspotMap.
import { useQuery } from '@tanstack/react-query'
import { fetchMap } from '../../../api/reports'
import { useReport } from '../../../state/reportContext'
import { HotspotMap } from '../../map/HotspotMap'
import { SectionCard } from '../SectionCard'

export function S2Mapa({ index }: { index: number }) {
  const { areaId } = useReport()
  const { data, isLoading } = useQuery({
    queryKey: ['map', areaId],
    queryFn: () => fetchMap(areaId),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <SectionCard
      index={index}
      id="section-mapa"
      title="Mapa da área"
      subtitle="Mancha criminal, fatores urbanos, câmeras e trechos críticos"
    >
      {isLoading || !data ? (
        <div className="map-skeleton" aria-hidden="true" />
      ) : (
        <HotspotMap pkg={data} />
      )}
      <p className="map-note">
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        A rota da FM é uma sugestão por marcadores de trechos prioritários, não um roteamento viário.
      </p>
    </SectionCard>
  )
}
