// Barramento do copiloto: seções pedem para abrir o painel já com uma
// pergunta pré-preenchida sobre aquele bloco.

const OPEN = 'compstat:copilot-open'
const ASK = 'compstat:copilot-ask'

export function openCopilot() {
  window.dispatchEvent(new CustomEvent(OPEN))
}

export function askCopilotAbout(sectionLabel: string) {
  const prompt = `Sobre a seção "${sectionLabel}": pode explicar e sugerir o que priorizar?`
  // garante o painel aberto e, no próximo frame (com o composer já montado),
  // entrega a pergunta
  openCopilot()
  requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent<string>(ASK, { detail: prompt }))
  })
}

export function onCopilotOpen(handler: () => void): () => void {
  const fn = () => handler()
  window.addEventListener(OPEN, fn)
  return () => window.removeEventListener(OPEN, fn)
}

export function onCopilotAsk(handler: (prompt: string) => void): () => void {
  const fn = (e: Event) => handler((e as CustomEvent<string>).detail)
  window.addEventListener(ASK, fn)
  return () => window.removeEventListener(ASK, fn)
}
