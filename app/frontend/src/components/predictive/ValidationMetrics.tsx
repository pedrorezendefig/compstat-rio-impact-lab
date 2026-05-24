// Métricas de validação do modelo logístico, um card por horizonte de previsão
// (T+1, T+2, T+4 semanas). Mostra discriminação (AUC), concentração (PAI) e
// autocorrelação espacial dos resíduos (Moran's I).
import { useQuery } from '@tanstack/react-query'
import { fetchMetricas } from './predictiveData'

const HORIZONTE_LABEL: Record<number, string> = {
  1: 'T+1 semana',
  2: 'T+2 semanas',
  4: 'T+4 semanas',
}

export function ValidationMetrics() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['pred-metricas'],
    queryFn: fetchMetricas,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return <p className="pred-state">Carregando métricas de validação…</p>
  }
  if (isError || !data) {
    return <p className="pred-state pred-state--error">Não foi possível carregar as métricas.</p>
  }

  const metricas = [...data].sort((a, b) => a.horizonte - b.horizonte)

  return (
    <div className="pred-metrics">
      <div className="pred-cards">
        {metricas.map((m) => (
          <div className="pred-card" key={m.horizonte}>
            <span className="pred-card__title">{HORIZONTE_LABEL[m.horizonte] ?? `T+${m.horizonte}`}</span>
            <dl className="pred-card__grid">
              <div className="pred-metric">
                <dt>AUC-ROC</dt>
                <dd className="tnum">{m.aucRoc.toFixed(3)}</dd>
              </div>
              <div className="pred-metric">
                <dt>AUC-PR</dt>
                <dd className="tnum">{m.aucPr.toFixed(3)}</dd>
              </div>
              <div className="pred-metric">
                <dt>PAI@10</dt>
                <dd className="tnum">{m.paiTop10.toFixed(1)}</dd>
              </div>
              <div className="pred-metric">
                <dt>Moran's I</dt>
                <dd className="tnum">
                  {m.moransI.toFixed(3)}
                  <span className="pred-metric__sub tnum"> (p {m.moransP.toFixed(3)})</span>
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
      <p className="pred-foot">
        PAI (Predictive Accuracy Index): concentração de acertos no top 10% de hexágonos de maior
        risco — quanto maior, melhor a priorização operacional.
      </p>
    </div>
  )
}
