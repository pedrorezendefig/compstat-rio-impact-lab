// Navegação por URL da aba Mapa Preditivo (sem React Router).
// ?view=preditivo -> aba Mapa Preditivo de Risco.

export function readViewFromUrl(): 'preditivo' | null {
  const v = new URLSearchParams(window.location.search).get('view')
  return v === 'preditivo' ? 'preditivo' : null
}

/** Abre a aba preditiva (remove ?area, define ?view=preditivo). */
export function pushPredictive(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('area')
  url.searchParams.set('view', 'preditivo')
  window.history.pushState(null, '', url.toString())
}

/** Volta ao panorama (remove ?view e ?area). */
export function clearView(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('view')
  url.searchParams.delete('area')
  window.history.pushState(null, '', url.toString())
}
