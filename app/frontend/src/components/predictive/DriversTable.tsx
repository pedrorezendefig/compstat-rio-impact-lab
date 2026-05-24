// Tabela de drivers por área: ranqueia hexágonos H3 por probabilidade prevista
// de crime e mostra os 3 fatores que mais contribuem para o risco de cada um.
import { useQuery } from '@tanstack/react-query'
import type { DriverArea } from './types'
import { fetchDrivers } from './predictiveData'

type RiskLevel = 'high' | 'med' | 'low'

function riskFromDecil(decil: number): RiskLevel {
  if (decil >= 8) return 'high'
  if (decil >= 5) return 'med'
  return 'low'
}

export function DriversTable({ filtroArea }: { filtroArea?: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['pred-drivers'],
    queryFn: fetchDrivers,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return <p className="pred-state">Carregando drivers de risco…</p>
  }
  if (isError || !data) {
    return <p className="pred-state pred-state--error">Não foi possível carregar os drivers.</p>
  }

  const rows: DriverArea[] = filtroArea ? data.filter((d) => d.areaFm === filtroArea) : data

  if (rows.length === 0) {
    return <p className="pred-state">Sem drivers para a área selecionada.</p>
  }

  const showArea = !filtroArea

  return (
    <div className="pred-table-wrap">
      <table className="pred-table">
        <thead>
          <tr>
            {showArea && <th>Área</th>}
            <th className="pred-table__num">Rank</th>
            <th className="pred-table__num">P(crime)</th>
            <th className="pred-table__num">Decil</th>
            <th>Driver 1</th>
            <th>Driver 2</th>
            <th>Driver 3</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const level = riskFromDecil(d.decilRisco)
            return (
              <tr key={d.hexId}>
                {showArea && <td className="pred-table__area">{d.areaFm}</td>}
                <td className="pred-table__num tnum">{d.rankArea}</td>
                <td className="pred-table__num">
                  <span className={`pred-badge pred-badge--${level} tnum`}>
                    {d.pCrimePct.toFixed(1)}%
                  </span>
                </td>
                <td className="pred-table__num tnum">{d.decilRisco}</td>
                <td>
                  <span className="pred-driver">{d.driver1}</span>
                  <span className="pred-driver__pct tnum">{d.contrib1Pct.toFixed(0)}%</span>
                </td>
                <td>
                  <span className="pred-driver">{d.driver2}</span>
                  <span className="pred-driver__pct tnum">{d.contrib2Pct.toFixed(0)}%</span>
                </td>
                <td>
                  <span className="pred-driver">{d.driver3}</span>
                  <span className="pred-driver__pct tnum">{d.contrib3Pct.toFixed(0)}%</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
