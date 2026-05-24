// Seção 6 — Dinâmica Criminal. Síntese qualitativa com proveniência forte
// (inteligência + denúncia + mancha). É onde o "como agem" fica explícito.
import type { AiBlock } from '../../../api/types'
import { AiBlockView } from '../AiBlockView'
import { SectionCard } from '../SectionCard'

export function S6DinamicaCriminal({ block, index }: { block: AiBlock; index: number }) {
  return (
    <SectionCard
      index={index}
      id="section-dinamica"
      title="Dinâmica criminal"
      subtitle="Como o crime se organiza na área (leitura qualitativa)"
    >
      <AiBlockView block={block} secao="dinamica" />
    </SectionCard>
  )
}
