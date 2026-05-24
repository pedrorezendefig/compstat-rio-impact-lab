// EditableTable — tabela com células editáveis em modo de edição.
// Reutilizada pelo Efetivo FM e pelo Plano de Ação. Cada coluna pode ter
// uma proveniência opcional exibida por linha.
import { Fragment, useState } from 'react'
import type { Provenance } from '../../api/types'
import { ProvenanceCard } from './ProvenanceCard'

export interface Column<Row> {
  key: keyof Row & string
  header: string
  editable?: boolean
  multiline?: boolean
  width?: string
  /** rótulo de leitura quando vazio */
  placeholder?: string
}

export function EditableTable<Row extends { provenance?: Provenance }>({
  columns,
  rows,
  editing,
  onCellChange,
  rowKey,
}: {
  columns: Column<Row>[]
  rows: Row[]
  editing: boolean
  onCellChange: (rowIndex: number, key: keyof Row & string, value: string) => void
  rowKey: (row: Row, index: number) => string
}) {
  const [openProv, setOpenProv] = useState<string | null>(null)

  return (
    <div className="etable-wrap">
      <table className="dtable etable">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={c.width ? { width: c.width } : undefined}>
                {c.header}
              </th>
            ))}
            <th style={{ width: '1%' }} aria-label="proveniência" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const key = rowKey(row, ri)
            const isOpen = openProv === key
            return (
              <Fragment key={key}>
                <tr>
                  {columns.map((c) => {
                    const raw = row[c.key]
                    const value = raw == null ? '' : String(raw)
                    return (
                      <td key={c.key}>
                        {editing && c.editable ? (
                          c.multiline ? (
                            <textarea
                              className="field-textarea"
                              rows={2}
                              value={value}
                              placeholder={c.placeholder}
                              onChange={(e) => onCellChange(ri, c.key, e.target.value)}
                            />
                          ) : (
                            <input
                              className="field-input"
                              value={value}
                              placeholder={c.placeholder}
                              onChange={(e) => onCellChange(ri, c.key, e.target.value)}
                            />
                          )
                        ) : value ? (
                          <span>{value}</span>
                        ) : (
                          <span className="cell-empty">{c.placeholder ?? '—'}</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="etable__provcell">
                    {row.provenance && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        aria-expanded={isOpen}
                        title="Como a IA chegou aqui"
                        onClick={() => setOpenProv(isOpen ? null : key)}
                      >
                        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
                {isOpen && row.provenance && (
                  <tr className="etable__provrow">
                    <td colSpan={columns.length + 1}>
                      <ProvenanceCard provenance={row.provenance} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
