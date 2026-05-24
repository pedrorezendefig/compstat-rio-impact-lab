// Seção 10 — Painel de Coincidências + Plano de Ação.
// O painel cruza as camadas; o plano lista ações com responsável, prazo e status.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCoincidencias } from '../../../api/reports'
import type { AcaoRow, MatchResult } from '../../../api/types'
import { useReport } from '../../../state/reportContext'
import { EditableTable } from '../EditableTable'
import type { Column } from '../EditableTable'
import { PainelCoincidencias } from '../PainelCoincidencias'
import { SectionCard } from '../SectionCard'

const ACAO_COLUMNS: Column<AcaoRow>[] = [
  { key: 'acao', header: 'Ação', editable: true, multiline: true, width: '42%' },
  { key: 'responsavel', header: 'Responsável', editable: true, width: '20%', placeholder: 'definir' },
  { key: 'prazo', header: 'Prazo', editable: true, width: '16%', placeholder: 'definir' },
  { key: 'status', header: 'Status', editable: true, width: '16%' },
]

export function S10Coincidencias({
  fallbackMatch,
  planoAcao,
  index,
}: {
  fallbackMatch: MatchResult
  planoAcao: AcaoRow[]
  index: number
}) {
  const { areaId, patchSection } = useReport()
  const [editing, setEditing] = useState(false)
  const [acoes, setAcoes] = useState(planoAcao)

  const { data: match } = useQuery({
    queryKey: ['coincidencias', areaId],
    queryFn: () => fetchCoincidencias(areaId),
    initialData: fallbackMatch,
    staleTime: 5 * 60 * 1000,
  })

  function onCellChange(ri: number, key: keyof AcaoRow & string, value: string) {
    setAcoes((prev) => {
      const next = prev.map((r, i) => (i === ri ? { ...r, [key]: value } : r))
      patchSection('coincidencias', { planoAcao: next }, next)
      return next
    })
  }

  return (
    <SectionCard
      index={index}
      id="section-coincidencias"
      title="Coincidências de alto risco e plano de ação"
      subtitle="Onde crime, fator e dinâmica se sobrepõem — e o que fazer"
      editing={editing}
      onToggleEdit={() => setEditing((v) => !v)}
    >
      <PainelCoincidencias match={match} />

      <div className="plano">
        <h3 className="plano__title">Plano de ação</h3>
        <EditableTable
          columns={ACAO_COLUMNS}
          rows={acoes}
          editing={editing}
          onCellChange={onCellChange}
          rowKey={(r) => r.id}
        />
      </div>
    </SectionCard>
  )
}
