// Campo de composição do copiloto. Enter envia, Shift+Enter quebra linha.
// Assina o barramento para receber perguntas pré-preenchidas de uma seção.
import { useEffect, useRef, useState } from 'react'
import { onCopilotAsk } from './copilotBus'

export function Composer({ disabled, onSend }: { disabled: boolean; onSend: (text: string) => void }) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  // pergunta vinda de uma seção: preenche e foca (dentro do callback do evento,
  // não durante a renderização)
  useEffect(
    () =>
      onCopilotAsk((prompt) => {
        setValue(prompt)
        const el = ref.current
        if (el) {
          el.focus()
          el.setSelectionRange(prompt.length, prompt.length)
        }
      }),
    [],
  )

  function submit() {
    if (!value.trim() || disabled) return
    onSend(value)
    setValue('')
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <textarea
        ref={ref}
        className="composer__input"
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={disabled ? 'Gerando resposta…' : 'Pergunte ao copiloto…'}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
      />
      <button type="submit" className="btn btn--primary btn--sm composer__send" disabled={disabled || !value.trim()}>
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
        <span className="sr-only">Enviar</span>
      </button>
    </form>
  )
}
