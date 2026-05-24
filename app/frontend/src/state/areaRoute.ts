// Navegação por URL (sem React Router).
// Sem ?area  -> página inicial (panorama de áreas).
// ?area=N    -> relatório da área N.

export function readAreaFromUrl(): number | null {
  const raw = new URLSearchParams(window.location.search).get('area')
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) ? n : null
}

function urlWith(area: number | null): string {
  const url = new URL(window.location.href)
  if (area == null) url.searchParams.delete('area')
  else url.searchParams.set('area', String(area))
  return url.toString()
}

/** Entra num relatório criando entrada no histórico (permite "voltar"). */
export function pushArea(area: number): void {
  window.history.pushState(null, '', urlWith(area))
}

/** Volta à página inicial criando entrada no histórico. */
export function pushHome(): void {
  window.history.pushState(null, '', urlWith(null))
}

/** Troca a área do relatório atual sem nova entrada no histórico (seletor). */
export function replaceArea(area: number): void {
  window.history.replaceState(null, '', urlWith(area))
}
