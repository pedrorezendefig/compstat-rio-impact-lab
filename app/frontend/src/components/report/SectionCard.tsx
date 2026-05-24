// SectionCard — moldura de uma seção do relatório.
// Cabeçalho numerado, título, ações opcionais (editar) e "perguntar ao copiloto".
import type { ReactNode } from 'react'
import { askCopilotAbout } from '../copilot/copilotBus'

export function SectionCard({
  index,
  id,
  title,
  subtitle,
  editing,
  onToggleEdit,
  children,
  aside,
}: {
  index: number
  /** id do elemento (âncora para scroll, ex. section-mapa) */
  id?: string
  title: string
  subtitle?: string
  /** quando definido, mostra o botão [editar]/[concluir] */
  editing?: boolean
  onToggleEdit?: () => void
  children: ReactNode
  /** conteúdo extra no cabeçalho à direita (antes das ações padrão) */
  aside?: ReactNode
}) {
  return (
    <section className="section" id={id} aria-labelledby={`${id ?? 'sec'}-title`}>
      <header className="section__head">
        <div className="section__heading">
          <span className="section__index" aria-hidden="true">
            {String(index).padStart(2, '0')}
          </span>
          <div>
            <h2 className="section__title" id={`${id ?? 'sec'}-title`}>
              {title}
            </h2>
            {subtitle && <p className="section__subtitle">{subtitle}</p>}
          </div>
        </div>

        <div className="section__actions">
          {aside}
          {onToggleEdit && (
            <button
              type="button"
              className={`btn btn--sm ${editing ? 'btn--primary' : ''}`}
              onClick={onToggleEdit}
            >
              {editing ? (
                'Concluir edição'
              ) : (
                <>
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
                  </svg>
                  Editar
                </>
              )}
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm section__ask"
            title="Perguntar ao copiloto sobre este bloco"
            onClick={() => askCopilotAbout(title)}
          >
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
            </svg>
            <span className="section__ask-label">Perguntar ao copiloto</span>
          </button>
        </div>
      </header>
      <div className="section__body">{children}</div>
    </section>
  )
}
