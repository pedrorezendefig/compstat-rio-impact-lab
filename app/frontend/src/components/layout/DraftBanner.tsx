// Faixa âmbar sticky de rascunho. Borda completa + fundo + ícone (sem faixa lateral).
export function DraftBanner() {
  return (
    <div className="draft-banner" role="status">
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <p>
        <strong>RASCUNHO — requer validação humana.</strong> A decisão final é do gestor.
      </p>
    </div>
  )
}
