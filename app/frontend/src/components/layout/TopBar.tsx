// Barra de topo fixa: identidade, seletor de área, exportação e toggle do copiloto.
import { AreaSelector } from './AreaSelector'
import { ExportButtons } from './ExportButtons'

export function TopBar({
  copilotOpen,
  onToggleCopilot,
  onGoHome,
  onOpenPredictive,
}: {
  copilotOpen: boolean
  onToggleCopilot: () => void
  onGoHome: () => void
  onOpenPredictive: () => void
}) {
  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar__brand"
        onClick={onGoHome}
        aria-label="Voltar ao panorama de áreas"
      >
        <span className="topbar__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </span>
        <div className="topbar__title">
          <strong>CompStat Rio</strong>
          <span className="topbar__subtitle">Relatório Analítico de Área</span>
        </div>
      </button>

      <div className="topbar__center">
        <AreaSelector />
      </div>

      <div className="topbar__actions">
        <button type="button" className="btn btn--sm" onClick={onOpenPredictive}>
          Mapa Preditivo
        </button>
        <ExportButtons />
        <span className="topbar__sep" aria-hidden="true" />
        <button
          type="button"
          className={`btn btn--sm topbar__copilot ${copilotOpen ? 'is-on' : ''}`}
          aria-pressed={copilotOpen}
          onClick={onToggleCopilot}
        >
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
          </svg>
          Copiloto
        </button>
      </div>
    </header>
  )
}
