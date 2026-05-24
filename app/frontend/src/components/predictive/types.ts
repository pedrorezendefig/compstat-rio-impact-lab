// Tipos do módulo preditivo (CompStat Rio). Consumidos pela UI e pela camada
// de carregamento (predictiveData.ts) e de mapas (predictiveMaps.ts).

export interface MetricaValidacao {
  horizonte: number; aucRoc: number; aucPr: number; paiTop10: number;
  moransI: number; moransP: number; nTrain: number; nTest: number;
  taxaPositivosTrain: number; taxaPositivosTest: number;
}
export interface Coeficiente {
  feature: string; betaS1: number; betaS2: number; betaS4: number;
  oddsRatioS1: number; oddsRatioS2: number; oddsRatioS4: number;
}
export interface DriverArea {
  areaFm: string; rankArea: number; hexId: string; pCrimePct: number; decilRisco: number;
  driver1: string; contrib1Pct: number; driver2: string; contrib2Pct: number;
  driver3: string; contrib3Pct: number;
}
export interface AreaMapa { nome: string; arquivo: string }
