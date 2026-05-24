// Seção 5 — Análise Temporal. Mapa de calor 7x24 + síntese de IA.
import { useQuery } from '@tanstack/react-query'
import { fetchTemporal } from '../../../api/reports'
import type { AiBlock } from '../../../api/types'
import { useReport } from '../../../state/reportContext'
import { TemporalHeatmap } from '../../temporal/TemporalHeatmap'
import { AiBlockView } from '../AiBlockView'
import { SectionCard } from '../SectionCard'

export function S5Temporal({ resumo, index }: { resumo: AiBlock; index: number }) {
  const { areaId } = useReport()
  const { data, isLoading } = useQuery({
    queryKey: ['temporal', areaId],
    queryFn: () => fetchTemporal(areaId),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <SectionCard
      index={index}
      id="section-temporal"
      title="Análise temporal"
      subtitle="Distribuição por dia da semana e hora"
    >
      {isLoading || !data ? (
        <div className="heatmap-skeleton" aria-hidden="true" />
      ) : (
        <>
          <div className="temporal-callouts">
            <span className="chip chip--primary">Pico: {data.diaCritico}{typeof data.horaCritica === 'number' ? `, ${data.horaCritica}h` : ''}</span>
            <span className="chip chip--neutral">Período predominante: {data.periodoPredominante}</span>
          </div>
          <TemporalHeatmap data={data} />
        </>
      )}
      <AiBlockView block={resumo} secao="temporal" />
    </SectionCard>
  )
}
