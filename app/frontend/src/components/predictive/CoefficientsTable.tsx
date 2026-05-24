// Coeficientes do modelo logístico expressos como odds ratios por horizonte.
// Ordenados pelo impacto no T+1 (distância de 1, em qualquer direção).
import { useQuery } from '@tanstack/react-query'
import { fetchCoeficientes } from './predictiveData'

export function CoefficientsTable() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['pred-coeficientes'],
    queryFn: fetchCoeficientes,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return <p className="pred-state">Carregando coeficientes…</p>
  }
  if (isError || !data) {
    return <p className="pred-state pred-state--error">Não foi possível carregar os coeficientes.</p>
  }

  const rows = [...data].sort(
    (a, b) => Math.abs(b.oddsRatioS1 - 1) - Math.abs(a.oddsRatioS1 - 1),
  )

  return (
    <div className="pred-coef">
      <p className="pred-foot pred-foot--lead">
        Odds ratio &gt; 1 aumenta a chance de crime; &lt; 1 reduz. Por horizonte de previsão.
      </p>
      <div className="pred-table-wrap pred-table-wrap--scroll">
        <table className="pred-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th className="pred-table__num">OR T+1</th>
              <th className="pred-table__num">OR T+2</th>
              <th className="pred-table__num">OR T+4</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const dir = c.oddsRatioS1 > 1 ? 'up' : c.oddsRatioS1 < 1 ? 'down' : 'flat'
              return (
                <tr key={c.feature}>
                  <td className="pred-coef__feat">{c.feature}</td>
                  <td className={`pred-table__num tnum pred-or pred-or--${dir}`}>
                    {c.oddsRatioS1.toFixed(2)}
                  </td>
                  <td className="pred-table__num tnum">{c.oddsRatioS2.toFixed(2)}</td>
                  <td className="pred-table__num tnum">{c.oddsRatioS4.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
