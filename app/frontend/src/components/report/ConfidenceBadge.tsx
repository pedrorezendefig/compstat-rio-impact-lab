// Selo de confiança. Cor + SEMPRE rótulo textual (cor nunca é o único sinal).
import type { Confianca } from '../../api/types'

const MAP: Record<Confianca, { label: string; cls: string; dots: number }> = {
  alta: { label: 'Confiança alta', cls: 'cb--alta', dots: 3 },
  media: { label: 'Confiança média', cls: 'cb--media', dots: 2 },
  baixa: { label: 'Confiança baixa', cls: 'cb--baixa', dots: 1 },
}

export function ConfidenceBadge({ level, compact }: { level: Confianca; compact?: boolean }) {
  const { label, cls, dots } = MAP[level]
  return (
    <span className={`cb ${cls}`} title={label}>
      <span className="cb__dots" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`cb__dot ${i < dots ? 'on' : ''}`} />
        ))}
      </span>
      <span className="cb__label">{compact ? MAP[level].label.replace('Confiança ', '') : label}</span>
    </span>
  )
}
