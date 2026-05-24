// Exportação. PDF e DOCX baixam o mesmo arquivo .docx do backend
// (no protótipo, o PDF reaproveita o endpoint de DOCX).
import { exportDocxUrl } from '../../api/reports'
import { useReport } from '../../state/reportContext'

export function ExportButtons() {
  const { areaId } = useReport()

  function download() {
    const a = document.createElement('a')
    a.href = exportDocxUrl(areaId)
    a.download = `relatorio-area-${areaId}.docx`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div className="export-group" role="group" aria-label="Exportar relatório">
      <button type="button" className="btn btn--sm" onClick={download} title="Exportar em PDF (protótipo: gera .docx)">
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        PDF
      </button>
      <button type="button" className="btn btn--sm" onClick={download} title="Exportar em DOCX">
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
        DOCX
      </button>
    </div>
  )
}
