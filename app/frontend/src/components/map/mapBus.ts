// Barramento mínimo para "ver no mapa": citações pedem foco em um ponto,
// o mapa escuta. Evita passar callbacks por toda a árvore.

export interface MapFocus {
  lat: number
  lon: number
}

const EVENT = 'compstat:focus-map'

export function focusOnMap(point: MapFocus) {
  window.dispatchEvent(new CustomEvent<MapFocus>(EVENT, { detail: point }))
  // leva o mapa ao campo de visão
  document.getElementById('section-mapa')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function onMapFocus(handler: (p: MapFocus) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<MapFocus>).detail)
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
