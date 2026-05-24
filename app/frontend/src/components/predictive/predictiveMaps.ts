// Catálogo de mapas de risco preditivo. Os nomes legíveis batem por igualdade
// de string com o campo `areaFm` dos drivers, então não os altere.
import type { AreaMapa } from './types'

export const MAPA_GERAL: AreaMapa = { nome: 'Todas as áreas (interativo)', arquivo: 'mapa_interativo.html' }

export const MAPAS_POR_AREA: AreaMapa[] = [
  { nome: 'Bangu: Calçadão - Bangu Shopping', arquivo: 'mapa_risco_t1_bangu_calcadao_bangu_shopping.html' },
  { nome: 'Campo Grande: Estação de Trem - Calçadão', arquivo: 'mapa_risco_t1_campo_grande_estacao_de_trem_calcadao.html' },
  { nome: 'Estações São Francisco Xavier - Afonso Pena', arquivo: 'mapa_risco_t1_estacoes_sao_francisco_xavier_afonso_pena.html' },
  { nome: 'Jardim de Alah', arquivo: 'mapa_risco_t1_jardim_de_alah.html' },
  { nome: 'Metrô Botafogo - Rua São Clemente - Rua Voluntários da Pátria', arquivo: 'mapa_risco_t1_metro_botafogo_rua_sao_clemente_rua_voluntarios_da_patria.html' },
  { nome: 'Praia de Botafogo - Rua Marquês de Abrantes', arquivo: 'mapa_risco_t1_praia_de_botafogo_rua_marques_de_abrantes.html' },
  { nome: 'Presidente Vargas - Campo de Santana - Central do Brasil - Cinelândia', arquivo: 'mapa_risco_t1_presidente_vargas_campo_de_santana_central_do_brasil_cinelan.html' },
  { nome: 'Rodoviária - Terminal Gentileza - Estação Leopoldina', arquivo: 'mapa_risco_t1_rodoviaria_terminal_gentileza_estacao_leopoldina.html' },
  { nome: 'Rua Lauro Müller – Avenida General Severiano – Avenida Venceslau Brás', arquivo: 'mapa_risco_t1_rua_lauro_muller_avenida_general_severiano_avenida_venceslau.html' },
]

export function mapaUrl(m: AreaMapa): string {
  const base = `${import.meta.env.BASE_URL}compstat/maps/`
  return m.arquivo === 'mapa_interativo.html' ? `${base}${m.arquivo}` : `${base}areas/${m.arquivo}`
}
