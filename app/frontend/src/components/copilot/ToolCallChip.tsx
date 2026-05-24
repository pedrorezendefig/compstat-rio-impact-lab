// Chip de chamada de ferramenta do copiloto (🔧 + rótulo amigável).
export function ToolCallChip({
  label,
  done,
  recordCount,
}: {
  label: string
  done?: boolean
  recordCount?: number
}) {
  return (
    <div className={`toolchip ${done ? 'is-done' : ''}`}>
      <span className="toolchip__icon" aria-hidden="true">
        {done ? (
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg className="icon toolchip__spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6 2 2 6-6a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2z" />
          </svg>
        )}
      </span>
      <span className="toolchip__label">{label}</span>
      {typeof recordCount === 'number' && (
        <span className="toolchip__count">{recordCount.toLocaleString('pt-BR')} reg.</span>
      )}
    </div>
  )
}
