// Carregamento dos CSVs preditivos servidos em /public/compstat/data. O parsing
// é POR POSIÇÃO DE COLUNA (não por nome de cabeçalho). Os arquivos não têm
// vírgulas nem aspas dentro de campos, então split por linha e por vírgula é seguro.
import type { Coeficiente, DriverArea, MetricaValidacao } from './types'

/** Divide o CSV em linhas de dados (sem cabeçalho), cada uma já quebrada por vírgula. */
function parseCsv(txt: string): string[][] {
  return txt
    .split('\n')
    .map((linha) => linha.replace(/\r/g, '').trim())
    .filter((linha) => linha.length > 0)
    .slice(1)
    .map((linha) => linha.split(','))
}

async function fetchCsv(arquivo: string): Promise<string[][]> {
  const url = `${import.meta.env.BASE_URL}compstat/data/${arquivo}.csv`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Falha ao carregar ${url}: ${res.status} ${res.statusText}`)
  const txt = await res.text()
  return parseCsv(txt)
}

export async function fetchMetricas(): Promise<MetricaValidacao[]> {
  const linhas = await fetchCsv('metricas_validacao')
  return linhas.map((c) => ({
    horizonte: Number(c[0]),
    aucRoc: Number(c[1]),
    aucPr: Number(c[2]),
    paiTop10: Number(c[3]),
    moransI: Number(c[4]),
    moransP: Number(c[5]),
    nTrain: Number(c[6]),
    nTest: Number(c[7]),
    taxaPositivosTrain: Number(c[8]),
    taxaPositivosTest: Number(c[9]),
  }))
}

export async function fetchCoeficientes(): Promise<Coeficiente[]> {
  const linhas = await fetchCsv('coeficientes_logit')
  return linhas.map((c) => ({
    feature: c[0],
    betaS1: Number(c[1]),
    betaS2: Number(c[2]),
    betaS4: Number(c[3]),
    oddsRatioS1: Number(c[4]),
    oddsRatioS2: Number(c[5]),
    oddsRatioS4: Number(c[6]),
  }))
}

export async function fetchDrivers(): Promise<DriverArea[]> {
  const linhas = await fetchCsv('top_drivers_por_area')
  return linhas.map((c) => ({
    areaFm: c[0],
    rankArea: Number(c[1]),
    hexId: c[2],
    pCrimePct: Number(c[3]),
    decilRisco: Number(c[4]),
    driver1: c[5],
    contrib1Pct: Number(c[6]),
    driver2: c[7],
    contrib2Pct: Number(c[8]),
    driver3: c[9],
    contrib3Pct: Number(c[10]),
  }))
}
