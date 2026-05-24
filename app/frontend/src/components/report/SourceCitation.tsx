// Uma citação de fonte em linguagem de negócio.
// - quantitativo: chip "Baseado em N registros…"
// - relint/disque: citação literal entre aspas, CLICÁVEL -> popover com fullText
//   (com o trecho citado realçado) e, se houver location, botão "ver no mapa".
// - fator/camera/dominio/cpsr: chip rotulado.
import { useEffect, useId, useRef, useState } from 'react'
import type { SourceCitation as Citation } from '../../api/types'
import { focusOnMap } from '../map/mapBus'

const KIND_LABEL: Record<Citation['kind'], string> = {
  quantitativo: 'Registros',
  relint: 'Inteligência',
  disque: 'Disque Denúncia',
  fator: 'Fator urbano',
  camera: 'Câmeras',
  dominio: 'Domínio territorial',
  cpsr: 'Censo PSR',
}

function IconFor({ kind }: { kind: Citation['kind'] }) {
  // ícones simples por tipo (linha, 1em)
  const common = { className: 'icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor' } as const
  switch (kind) {
    case 'relint':
    case 'disque':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    case 'camera':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M23 7l-7 5 7 5V7z" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
      )
    case 'fator':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    default:
      return (
        <svg {...common} aria-hidden="true">
          <path d="M3 3v18h18" />
          <rect x="7" y="12" width="3" height="6" />
          <rect x="12" y="8" width="3" height="10" />
          <rect x="17" y="5" width="3" height="13" />
        </svg>
      )
  }
}

/** Realça o trecho citado dentro do texto completo. */
function Highlighted({ full, quote }: { full: string; quote?: string }) {
  if (!quote) return <>{full}</>
  const idx = full.toLowerCase().indexOf(quote.toLowerCase())
  if (idx < 0) return <>{full}</>
  return (
    <>
      {full.slice(0, idx)}
      <mark className="quote-hl">{full.slice(idx, idx + quote.length)}</mark>
      {full.slice(idx + quote.length)}
    </>
  )
}

export function SourceCitation({ c }: { c: Citation }) {
  const isTextual = c.kind === 'relint' || c.kind === 'disque'
  const isQuant = c.kind === 'quantitativo'

  if (isTextual && c.quote) {
    return <QuotedCitation c={c} />
  }

  if (isQuant) {
    return (
      <span className="src-chip src-chip--quant">
        <IconFor kind={c.kind} />
        {typeof c.recordCount === 'number'
          ? `Baseado em ${c.recordCount.toLocaleString('pt-BR')} registro${c.recordCount === 1 ? '' : 's'}`
          : c.label}
        {typeof c.recordCount === 'number' && <span className="src-chip__sub">{c.label}</span>}
      </span>
    )
  }

  // fator / camera / dominio / cpsr / textual sem quote
  return (
    <span className="src-chip">
      <IconFor kind={c.kind} />
      <span className="src-chip__kind">{KIND_LABEL[c.kind]}</span>
      {c.label}
      {typeof c.recordCount === 'number' && (
        <span className="src-chip__sub">{c.recordCount.toLocaleString('pt-BR')}</span>
      )}
    </span>
  )
}

function QuotedCitation({ c }: { c: Citation }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const popId = useId()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div className="quote-wrap" ref={ref}>
      <button
        type="button"
        className="quote-btn"
        aria-expanded={open}
        aria-controls={popId}
        onClick={() => setOpen((v) => !v)}
      >
        <IconFor kind={c.kind} />
        <span className="quote-text">“{c.quote}”</span>
        <span className="quote-src">{c.label}</span>
      </button>

      {open && (
        <div className="quote-pop" id={popId} role="dialog" aria-label={`Fonte: ${c.label}`}>
          <div className="quote-pop__head">
            <span className="src-chip__kind">{KIND_LABEL[c.kind]}</span>
            <span className="quote-pop__title">{c.label}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>
              Fechar
            </button>
          </div>
          <div className="quote-pop__body">
            <Highlighted full={c.fullText ?? c.quote ?? ''} quote={c.quote} />
          </div>
          {c.location && (
            <div className="quote-pop__foot">
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  focusOnMap(c.location!)
                  setOpen(false)
                }}
              >
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Ver no mapa
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
