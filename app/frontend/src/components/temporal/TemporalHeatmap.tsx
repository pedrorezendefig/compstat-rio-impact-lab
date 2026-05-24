// Mapa de calor temporal 7x24. Grid CSS colorido por intensidade (escala
// sequencial). Hover mostra "Quarta, 19h · N". Pico destacado. Célula sem
// dado (valor < 0) é visualmente distinta do zero.
import { useMemo, useState } from 'react'
import type { TemporalMatrix } from '../../api/types'

interface Hover {
  d: number
  h: number
  v: number
  x: number
  y: number
}

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const DIA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function heatVar(v: number, max: number): string {
  if (v < 0) return 'var(--no-data)'
  if (v === 0) return 'var(--heat-0)'
  const t = max > 0 ? v / max : 0
  if (t < 0.18) return 'var(--heat-1)'
  if (t < 0.38) return 'var(--heat-2)'
  if (t < 0.6) return 'var(--heat-3)'
  if (t < 0.82) return 'var(--heat-4)'
  return 'var(--heat-5)'
}

export function TemporalHeatmap({ data }: { data: TemporalMatrix }) {
  const [hover, setHover] = useState<Hover | null>(null)

  const { max, peak } = useMemo(() => {
    let m = 0
    let pk = { d: -1, h: -1, v: -1 }
    data.matrix.forEach((row, d) =>
      row.forEach((v, h) => {
        if (v > m) m = v
        if (v > pk.v) pk = { d, h, v }
      }),
    )
    return { max: m, peak: pk }
  }, [data])

  return (
    <div className="heatmap">
      <div className="heatmap__grid-wrap">
        {/* eixo de horas */}
        <div className="heatmap__hours" aria-hidden="true">
          <span className="heatmap__corner" />
          {HOURS.map((h) => (
            <span key={h} className="heatmap__hour">
              {h % 3 === 0 ? `${h}h` : ''}
            </span>
          ))}
        </div>

        {data.matrix.map((row, d) => (
          <div className="heatmap__row" key={d}>
            <span className="heatmap__day" aria-hidden="true">
              {DIA_CURTO[d]}
            </span>
            {row.map((v, h) => {
              const isPeak = d === peak.d && h === peak.h
              const noData = v < 0
              return (
                <button
                  key={h}
                  type="button"
                  className={`heatmap__cell ${isPeak ? 'is-peak' : ''} ${noData ? 'is-nodata' : ''}`}
                  style={{ background: heatVar(v, max) }}
                  aria-label={`${data.dias[d] ?? DIA_CURTO[d]}, ${h}h: ${noData ? 'sem dado' : `${v} ocorrências`}`}
                  onMouseEnter={(e) => {
                    const r = e.currentTarget.getBoundingClientRect()
                    const wrap = e.currentTarget.closest('.heatmap')!.getBoundingClientRect()
                    setHover({ d, h, v, x: r.left - wrap.left + r.width / 2, y: r.top - wrap.top })
                  }}
                  onMouseLeave={() => setHover(null)}
                  onFocus={(e) => {
                    const r = e.currentTarget.getBoundingClientRect()
                    const wrap = e.currentTarget.closest('.heatmap')!.getBoundingClientRect()
                    setHover({ d, h, v, x: r.left - wrap.left + r.width / 2, y: r.top - wrap.top })
                  }}
                  onBlur={() => setHover(null)}
                />
              )
            })}
          </div>
        ))}
      </div>

      {hover && (
        <div className="heatmap__tip" style={{ left: hover.x, top: hover.y }} role="tooltip">
          <strong>
            {data.dias[hover.d] ?? DIA_CURTO[hover.d]}, {hover.h}h
          </strong>
          <span>{hover.v < 0 ? 'sem dado' : `${hover.v} ocorrência${hover.v === 1 ? '' : 's'}`}</span>
        </div>
      )}

      <div className="heatmap__legend">
        <span className="heatmap__legend-label">menos</span>
        {['var(--heat-0)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)', 'var(--heat-5)'].map(
          (c) => (
            <span key={c} className="heatmap__legend-swatch" style={{ background: c }} />
          ),
        )}
        <span className="heatmap__legend-label">mais</span>
        <span className="heatmap__legend-sep" />
        <span className="heatmap__legend-swatch heatmap__legend-swatch--nodata" />
        <span className="heatmap__legend-label">sem dado</span>
      </div>
    </div>
  )
}
