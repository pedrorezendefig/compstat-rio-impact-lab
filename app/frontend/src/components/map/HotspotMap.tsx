// HotspotMap — MapLibre GL. Basemap raster claro (CARTO light_all, sem chave).
// Camadas: heatmap de ocorrências, fill do polígono da área, círculos de
// câmeras e fatores urbanos, e trechos críticos coloridos por score (legenda).
// Escuta o barramento de foco ("ver no mapa") e ajusta o enquadramento ao polígono.
import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type { StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { MapPackage } from '../../api/mapTypes'
import { onMapFocus } from './mapBus'
import { MapLegend } from './MapLegend'
import type { LayerKey, LayerToggles } from './MapLegend'

// Basemap raster definido inline. Vantagem decisiva sobre um style vetorial
// externo (ex.: CARTO positron via CDN): o evento "load" dispara de imediato,
// sem depender de baixar style.json + glyphs + sprites — recursos que a rede
// institucional costuma bloquear. Assim o polígono e as manchas renderizam
// mesmo que os tiles do basemap demorem ou falhem (o layer "paper" garante um
// fundo claro por baixo).
const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    base: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap · © CARTO',
    },
  },
  layers: [
    { id: 'paper', type: 'background', paint: { 'background-color': '#eef1f5' } },
    { id: 'base', type: 'raster', source: 'base' },
  ],
}

// cores literais (paint do maplibre não aceita var() do CSS)
const C = {
  area: '#16425B',
  heat1: '#bcd0e8',
  heat3: '#e8b08f',
  heat5: '#b24a3f',
  camera: '#2E7D5B',
  factor: '#B8860B',
  crit2: '#d8a37e',
  crit4: '#c2603f',
  crit5: '#8f3a2f',
}

function pointCoords(f: maplibregl.MapGeoJSONFeature): [number, number] {
  const g = f.geometry as unknown as { coordinates: [number, number] }
  return g.coordinates
}

function bounds(pkg: MapPackage): maplibregl.LngLatBounds | null {
  const poly = pkg.areaPolygon.features[0]
  if (!poly || poly.geometry.type !== 'Polygon') return null
  const b = new maplibregl.LngLatBounds()
  poly.geometry.coordinates[0].forEach((c) => b.extend(c as [number, number]))
  return b
}

export function HotspotMap({ pkg }: { pkg: MapPackage }) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [ready, setReady] = useState(false)
  const [toggles, setToggles] = useState<LayerToggles>({
    occurrences: true,
    cameras: true,
    urbanFactors: true,
    criticalSegments: true,
  })

  // init uma vez
  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const b = bounds(pkg)
    const map = new maplibregl.Map({
      container: elRef.current,
      style: BASE_STYLE,
      center: [-43.18, -22.91],
      zoom: 13,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    // tiles do basemap podem falhar (rede/CDN) — apenas registramos; as camadas
    // de dados (polígono, manchas, pontos) são locais e seguem renderizando
    map.on('error', (e) => console.warn('[mapa] recurso do basemap indisponível:', e?.error?.message ?? e))
    mapRef.current = map

    map.on('load', () => {
      // ---- fontes ----
      map.addSource('occ', { type: 'geojson', data: pkg.occurrences })
      map.addSource('area', { type: 'geojson', data: pkg.areaPolygon })
      map.addSource('cam', { type: 'geojson', data: pkg.cameras })
      map.addSource('fac', { type: 'geojson', data: pkg.urbanFactors })
      map.addSource('crit', { type: 'geojson', data: pkg.criticalSegments })

      // ---- polígono da área ----
      map.addLayer({
        id: 'area-fill',
        type: 'fill',
        source: 'area',
        paint: { 'fill-color': C.area, 'fill-opacity': 0.06 },
      })
      map.addLayer({
        id: 'area-line',
        type: 'line',
        source: 'area',
        paint: { 'line-color': C.area, 'line-width': 1.6, 'line-dasharray': [3, 2] },
      })

      // ---- heatmap de ocorrências ----
      map.addLayer({
        id: 'occ-heat',
        type: 'heatmap',
        source: 'occ',
        maxzoom: 17,
        paint: {
          'heatmap-weight': 0.6,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 11, 0.8, 16, 2.2],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 11, 12, 16, 34],
          'heatmap-opacity': 0.72,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(188,208,232,0)',
            0.25, C.heat1,
            0.6, C.heat3,
            1, C.heat5,
          ],
        },
      })

      // ---- fatores urbanos ----
      map.addLayer({
        id: 'fac-pts',
        type: 'circle',
        source: 'fac',
        paint: {
          'circle-radius': 5,
          'circle-color': C.factor,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.9,
        },
      })

      // ---- câmeras ----
      map.addLayer({
        id: 'cam-pts',
        type: 'circle',
        source: 'cam',
        paint: {
          'circle-radius': 5,
          'circle-color': C.camera,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.92,
        },
      })

      // ---- trechos críticos (por score) ----
      map.addLayer({
        id: 'crit-halo',
        type: 'circle',
        source: 'crit',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 0.3, 14, 1, 26],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'score'],
            0.4, C.crit2,
            0.7, C.crit4,
            0.92, C.crit5,
          ],
          'circle-opacity': 0.22,
        },
      })
      map.addLayer({
        id: 'crit-pts',
        type: 'circle',
        source: 'crit',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 0.3, 6, 1, 12],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'score'],
            0.4, C.crit2,
            0.7, C.crit4,
            0.92, C.crit5,
          ],
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      })

      // popups
      const popup = new maplibregl.Popup({ closeButton: true, offset: 12, maxWidth: '260px' })
      map.on('click', 'crit-pts', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties as { score: number; justificativa: string }
        popup
          .setLngLat(pointCoords(f))
          .setHTML(
            `<div class="mappop"><strong>Trecho crítico</strong><span class="mappop__score">score ${Number(
              p.score,
            ).toFixed(2)}</span><p>${p.justificativa}</p></div>`,
          )
          .addTo(map)
      })
      map.on('click', 'cam-pts', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties as { nome?: string }
        popup
          .setLngLat(pointCoords(f))
          .setHTML(`<div class="mappop"><strong>${p.nome ?? 'Câmera'}</strong><p>Cobertura de vigilância</p></div>`)
          .addTo(map)
      })
      map.on('click', 'fac-pts', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties as { fator: string; orgao?: string }
        popup
          .setLngLat(pointCoords(f))
          .setHTML(
            `<div class="mappop"><strong>${p.fator}</strong><p>Órgão responsável: ${p.orgao ?? '—'}</p></div>`,
          )
          .addTo(map)
      })
      for (const id of ['crit-pts', 'cam-pts', 'fac-pts']) {
        map.on('mouseenter', id, () => (map.getCanvas().style.cursor = 'pointer'))
        map.on('mouseleave', id, () => (map.getCanvas().style.cursor = ''))
      }

      if (b) map.fitBounds(b, { padding: 48, duration: 0 })
      setReady(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // foco vindo das citações ("ver no mapa")
  useEffect(() => {
    return onMapFocus(({ lat, lon }) => {
      const map = mapRef.current
      if (!map) return
      map.flyTo({ center: [lon, lat], zoom: 16.2, duration: 900 })
      const marker = new maplibregl.Marker({ color: '#16425B' }).setLngLat([lon, lat]).addTo(map)
      window.setTimeout(() => marker.remove(), 4000)
    })
  }, [])

  // aplica toggles de camadas
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const vis = (id: string, on: boolean) =>
      map.getLayer(id) && map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none')
    vis('occ-heat', toggles.occurrences)
    vis('cam-pts', toggles.cameras)
    vis('fac-pts', toggles.urbanFactors)
    vis('crit-halo', toggles.criticalSegments)
    vis('crit-pts', toggles.criticalSegments)
  }, [toggles, ready])

  // reprojeta o canvas quando o container muda de tamanho (copiloto/sidebar
  // abrindo, troca de orientação, tela cheia) — o MapLibre não faz isso sozinho
  useEffect(() => {
    const el = elRef.current
    if (!el) return
    const ro = new ResizeObserver(() => mapRef.current?.resize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // tela cheia: reprojeta ao alternar, ESC recolhe e trava o scroll de fundo
  useEffect(() => {
    const id = requestAnimationFrame(() => mapRef.current?.resize())
    if (!expanded) return () => cancelAnimationFrame(id)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [expanded])

  function onToggle(key: LayerKey) {
    setToggles((t) => ({ ...t, [key]: !t[key] }))
  }

  return (
    <div className={`hotspot ${expanded ? 'hotspot--full' : ''}`}>
      <div className="hotspot__canvas" ref={elRef} />
      <MapLegend toggles={toggles} onToggle={onToggle} />
      <button
        type="button"
        className="hotspot__expand"
        onClick={() => setExpanded((v) => !v)}
        aria-pressed={expanded}
        aria-label={expanded ? 'Recolher mapa' : 'Expandir mapa para tela cheia'}
      >
        {expanded ? (
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path d="M8 3v3a2 2 0 0 1-2 2H3" />
            <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
            <path d="M3 16h3a2 2 0 0 1 2 2v3" />
            <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
          </svg>
        ) : (
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        )}
        <span>{expanded ? 'Recolher' : 'Expandir'}</span>
      </button>
    </div>
  )
}
