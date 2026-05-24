// Tipos do pacote de mapa (GET /api/areas/{id}/map).
// O contrato types.ts não tipa o GeoJSON; mantemos tipos locais mínimos aqui.
import type { CamadaMatch } from './types'

export interface FeatureCollection<P = Record<string, unknown>> {
  type: 'FeatureCollection'
  features: Feature<P>[]
}
export interface Feature<P = Record<string, unknown>> {
  type: 'Feature'
  geometry: Geometry
  properties: P
}
export type Geometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'Polygon'; coordinates: [number, number][][] }

export interface OccurrenceProps {
  tipo?: string
  peso?: number
}
export interface CameraProps {
  nome?: string
  status?: string
}
export interface UrbanFactorProps {
  fator: string
  orgao?: string
}
export interface CriticalSegmentProps {
  id: string
  score: number
  justificativa: string
  camadas: CamadaMatch[]
}

export interface MapPackage {
  occurrences: FeatureCollection<OccurrenceProps>
  areaPolygon: FeatureCollection
  cameras: FeatureCollection<CameraProps>
  urbanFactors: FeatureCollection<UrbanFactorProps>
  criticalSegments: FeatureCollection<CriticalSegmentProps>
}
