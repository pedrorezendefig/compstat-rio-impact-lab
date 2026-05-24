// Seção 4 — Ocorrências. Indicadores do período + distribuição por tipo.
import type { Ocorrencias } from '../../../api/types'
import { ProvenanceCard } from '../ProvenanceCard'
import { SectionCard } from '../SectionCard'

export function S4Ocorrencias({ data, index }: { data: Ocorrencias; index: number }) {
  const { indicadores: ind, distribuicao } = data
  const maxQtd = Math.max(...distribuicao.map((d) => d.qtd), 1)
  const variacao = ind.variacaoPct

  return (
    <SectionCard
      index={index}
      id="section-ocorrencias"
      title="Ocorrências no período"
      subtitle="Furto e roubo registrados na área"
    >
      <div className="stat-strip">
        <div className="stat stat--accent">
          <span className="stat__value tnum">{ind.total.toLocaleString('pt-BR')}</span>
          <span className="stat__label">Total de ocorrências</span>
        </div>
        <div className="stat">
          <span className="stat__value tnum">{ind.roubos.toLocaleString('pt-BR')}</span>
          <span className="stat__label">Roubos</span>
        </div>
        {typeof ind.furtos === 'number' && (
          <div className="stat">
            <span className="stat__value tnum">{ind.furtos.toLocaleString('pt-BR')}</span>
            <span className="stat__label">Furtos</span>
          </div>
        )}
        <div className="stat">
          <span className="stat__value tnum">{ind.rankingEntreAreas}º</span>
          <span className="stat__label">Ranking entre áreas</span>
        </div>
        {typeof variacao === 'number' && (
          <div className="stat">
            <span className={`stat__value stat__trend tnum ${variacao > 0 ? 'stat__value--up' : 'stat__value--down'}`}>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                {variacao > 0 ? (
                  <>
                    <path d="M7 17 17 7" />
                    <path d="M8 7h9v9" />
                  </>
                ) : (
                  <>
                    <path d="M7 7l10 10" />
                    <path d="M17 8v9H8" />
                  </>
                )}
              </svg>
              {variacao > 0 ? '+' : ''}
              {variacao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
            </span>
            <span className="stat__label">Variação vs. período anterior</span>
          </div>
        )}
      </div>

      <div className="distro">
        <span className="distro__title">Distribuição por tipo</span>
        <table className="dtable distro__table">
          <thead>
            <tr>
              <th>Tipo de crime</th>
              <th className="num">Qtd</th>
              <th>Participação</th>
            </tr>
          </thead>
          <tbody>
            {distribuicao.map((d) => (
              <tr key={d.tipo}>
                <td>
                  <span className="distro__rank" aria-hidden="true">
                    {d.rank}
                  </span>
                  {d.tipo}
                </td>
                <td className="num">{d.qtd.toLocaleString('pt-BR')}</td>
                <td>
                  <span className="distro__bar" aria-hidden="true">
                    <span className="distro__bar-fill" style={{ width: `${(d.qtd / maxQtd) * 100}%` }} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProvenanceCard provenance={data.provenance} />
    </SectionCard>
  )
}
