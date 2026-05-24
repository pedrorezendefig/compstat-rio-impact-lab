// Contexto e hook do relatório (separados do provider para manter o arquivo
// do componente exportando apenas componentes — bom para o Fast Refresh).
import { createContext, useContext } from 'react'
import type { AiBlock, Relatorio } from '../api/types'

export interface ReportContextValue {
  areaId: number
  setAreaId: (id: number) => void
  report: Relatorio | undefined
  isLoading: boolean
  isError: boolean
  /** Edição genérica de uma seção (otimista). */
  patchSection: (secao: string, patch: Partial<Relatorio>, payload?: unknown) => void
  /** Aplica a sugestão do copiloto a um bloco (otimista). */
  applySuggestion: (sectionId: string, blockId: string, proposedText: string) => Promise<void>
  /** Regenera o bloco de IA de uma seção. */
  regenerate: (secao: string) => Promise<AiBlock>
}

export const ReportContext = createContext<ReportContextValue | null>(null)

export function useReport(): ReportContextValue {
  const ctx = useContext(ReportContext)
  if (!ctx) throw new Error('useReport precisa estar dentro de <ReportProvider>')
  return ctx
}
