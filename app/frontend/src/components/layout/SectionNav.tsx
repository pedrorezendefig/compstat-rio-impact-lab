// SectionNav — índice lateral das seções do relatório com scroll spy.
// Observa os <section.section> dentro de .shell__scroll e destaca a visível;
// clicar rola suavemente até a seção. Usa a ORDEM das seções (não ids fixos),
// então o componente não exige alterações nas 10 seções existentes.
import { useEffect, useRef, useState } from 'react'
import { useReport } from '../../state/reportContext'

const LABELS = [
  'Identificação',
  'Mapa',
  'Resumo executivo',
  'Ocorrências',
  'Padrão temporal',
  'Dinâmica criminal',
  'Efetivo FM',
  'Fatores urbanos',
  'Câmeras',
  'Coincidências',
]

function sectionEls(): HTMLElement[] {
  const root = document.querySelector<HTMLElement>('.shell__scroll')
  return root ? Array.from(root.querySelectorAll<HTMLElement>('.section')) : []
}

export function SectionNav() {
  const { report, isLoading } = useReport()
  const [active, setActive] = useState(0)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!report) return
    const root = document.querySelector<HTMLElement>('.shell__scroll')
    const sections = sectionEls()
    if (!root || !sections.length) return

    // "in view" = seção que cruza a faixa superior do scroll (top 35%).
    // A seção ativa é a de menor índice entre as visíveis (a mais ao topo).
    const inView = new Set<number>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const idx = sections.indexOf(e.target as HTMLElement)
          if (idx < 0) continue
          if (e.isIntersecting) inView.add(idx)
          else inView.delete(idx)
        }
        if (inView.size) setActive(Math.min(...inView))
      },
      { root, rootMargin: '0px 0px -65% 0px', threshold: 0 },
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [report])

  // mantém o item ativo visível quando a nav está em modo horizontal (mobile)
  useEffect(() => {
    itemRefs.current[active]?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [active])

  function go(i: number) {
    sectionEls()[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (isLoading || !report) return null

  return (
    <nav className="secnav" aria-label="Seções do relatório">
      <span className="secnav__title">Seções</span>
      <ol className="secnav__list">
        {LABELS.map((label, i) => (
          <li key={label}>
            <button
              ref={(el) => {
                itemRefs.current[i] = el
              }}
              type="button"
              className={`secnav__item ${i === active ? 'is-active' : ''}`}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => go(i)}
            >
              <span className="secnav__num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="secnav__label">{label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
