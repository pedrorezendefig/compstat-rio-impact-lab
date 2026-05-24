// Estado central do relatório. React Query para dados; contexto para ações.
// A área inicial vem do App (roteamento por ?area); trocas internas (seletor)
// atualizam a URL via replaceArea.
import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchReport,
  patchSection as apiPatchSection,
  regenerateSection as apiRegenerate,
} from '../api/reports'
import { applySuggestion as apiApply } from '../api/copilot'
import type { Relatorio } from '../api/types'
import { replaceArea } from './areaRoute'
import { ReportContext } from './reportContext'
import type { ReportContextValue } from './reportContext'

function reportKey(areaId: number) {
  return ['report', areaId] as const
}

export function ReportProvider({ children, initialArea }: { children: ReactNode; initialArea: number }) {
  const qc = useQueryClient()
  const [areaId, setAreaIdState] = useState<number>(initialArea)

  const setAreaId = useCallback((id: number) => {
    setAreaIdState(id)
    replaceArea(id)
  }, [])

  const query = useQuery({
    queryKey: reportKey(areaId),
    queryFn: () => fetchReport(areaId),
    staleTime: 5 * 60 * 1000,
  })

  // Edição otimista de seção determinística
  const patchMutation = useMutation({
    mutationFn: ({ secao, payload }: { secao: string; patch: Partial<Relatorio>; payload?: unknown }) =>
      apiPatchSection(areaId, secao, payload ?? {}),
  })

  const patchSection = useCallback(
    (secao: string, patch: Partial<Relatorio>, payload?: unknown) => {
      const key = reportKey(areaId)
      qc.setQueryData<Relatorio>(key, (prev) => (prev ? { ...prev, ...patch } : prev))
      patchMutation.mutate({ secao, patch, payload })
    },
    [areaId, qc, patchMutation],
  )

  const regenerate = useCallback(
    async (secao: string) => {
      return apiRegenerate(areaId, secao)
    },
    [areaId],
  )

  // Aplica sugestão do copiloto: atualiza o bloco correspondente no cache
  const applySuggestion = useCallback(
    async (sectionId: string, blockId: string, proposedText: string) => {
      const key = reportKey(areaId)
      qc.setQueryData<Relatorio>(key, (prev) => (prev ? applyToReport(prev, blockId, proposedText) : prev))
      await apiApply(areaId, { sectionId, blockId, proposedText })
    },
    [areaId, qc],
  )

  const value = useMemo<ReportContextValue>(
    () => ({
      areaId,
      setAreaId,
      report: query.data,
      isLoading: query.isLoading,
      isError: query.isError,
      patchSection,
      applySuggestion,
      regenerate,
    }),
    [areaId, setAreaId, query.data, query.isLoading, query.isError, patchSection, applySuggestion, regenerate],
  )

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>
}

/** Atualiza um bloco editável (resumo, temporal, dinâmica, efetivo) por blockId. */
function applyToReport(report: Relatorio, blockId: string, text: string): Relatorio {
  const next: Relatorio = { ...report }
  next.resumoExecutivo = report.resumoExecutivo.map((p) =>
    p.diagnostico.blockId === blockId
      ? { ...p, diagnostico: { ...p.diagnostico, text, editedByHuman: true } }
      : p,
  )
  if (report.temporalResumo.blockId === blockId)
    next.temporalResumo = { ...report.temporalResumo, text, editedByHuman: true }
  if (report.dinamicaCriminal.blockId === blockId)
    next.dinamicaCriminal = { ...report.dinamicaCriminal, text, editedByHuman: true }
  next.efetivoFM = report.efetivoFM.map((r) =>
    r.blockId === blockId ? { ...r, sugestao: text } : r,
  )
  return next
}
