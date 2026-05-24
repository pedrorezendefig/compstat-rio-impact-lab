// Fixtures de demonstração — Área 20 "Presidente Vargas / Central".
// Permite que toda a UI renderize sem backend. Todos os textos em pt-BR,
// proveniência em linguagem de gestor (nunca SQL/JSON/prompt na superfície).
import type {
  AreaInfo,
  AreaResumo,
  MatchResult,
  Provenance,
  Relatorio,
  TemporalMatrix,
} from './types'
import type { MapPackage } from './mapTypes'

// Centro aproximado da área (Presidente Vargas / Central, Rio).
const CENTER: [number, number] = [-43.18, -22.91]

// ---------------------------------------------------------------------------
// Proveniências reutilizáveis (cada uma em linguagem de negócio)
// ---------------------------------------------------------------------------
const provIdentificacao: Provenance = {
  rationale:
    'Limites e bairros vêm do polígono oficial da Força Municipal para esta área. O grupo criminoso de influência foi extraído do mapeamento de domínio territorial vigente. Os campos administrativos (AISP, DP, BPM, base) ficam em branco para preenchimento do gestor.',
  confidence: 'alta',
  sources: [
    { kind: 'dominio', label: 'Mapeamento de domínio territorial', confidence: 'alta' },
    {
      kind: 'quantitativo',
      label: 'Polígono oficial da área da FM',
      recordCount: 1,
      confidence: 'alta',
    },
  ],
  technicalDetail:
    'Geometria: areas_forca_municipal (área 20). Cruzamento espacial com dominio_territorial por interseção de polígonos.',
}

const provOcorrencias: Provenance = {
  rationale:
    'Os totais somam os registros georreferenciados de furto e roubo dentro do polígono da área no período. O ranking compara o volume desta área com as demais 21 áreas prioritárias.',
  confidence: 'alta',
  sources: [
    {
      kind: 'quantitativo',
      label: 'Ocorrências de furto e roubo no período',
      recordCount: 1284,
      confidence: 'alta',
    },
  ],
  warnings: [
    'Subnotificação esperada: registros dependem de Boletim de Ocorrência. A leitura qualitativa (Disque Denúncia e RELINT) complementa o número.',
  ],
  technicalDetail:
    'Fonte: df_ocorrencias_tratado, filtrado por área 20 e janela do período. Roubos=812, furtos=472.',
}

const provTemporal: Provenance = {
  rationale:
    'O padrão de horário foi calculado a partir da data e hora de cada ocorrência registrada. O pico concentra-se no fim de tarde dos dias úteis, quando a circulação de pedestres no entorno da Uruguaiana é mais intensa.',
  confidence: 'alta',
  sources: [
    {
      kind: 'quantitativo',
      label: 'Ocorrências com data/hora válidas',
      recordCount: 1190,
      confidence: 'alta',
    },
  ],
  warnings: ['94 registros sem horário preenchido foram excluídos da matriz temporal.'],
  technicalDetail:
    'Matriz 7x24 (dia da semana x hora). Pico em quarta-feira às 18h. Cobertura por dia em coverage.',
}

const provDinamica: Provenance = {
  rationale:
    'A síntese cruza três camadas: a concentração de furtos e roubos (mancha), as denúncias qualitativas sobre o modo de agir e os relatórios de inteligência da área. A leitura aponta furtos a pé valendo-se da aglomeração no calçadão e fuga pelo Campo de Santana.',
  confidence: 'media',
  sources: [
    {
      kind: 'relint',
      label: 'RELINT RI-017/2026 — Presidente Vargas / Campo de Santana',
      docId: 'RI-017-2026',
      quote:
        'a maioria das subtrações ocorre a pé na altura da Uruguaiana, com evasão imediata em direção ao Campo de Santana, aproveitando a densidade do fluxo de pedestres no fim da tarde',
      fullText:
        'RELATÓRIO DE INTELIGÊNCIA RI-017/2026 — Presidente Vargas / Campo de Santana. Síntese operacional: a maioria das subtrações ocorre a pé na altura da Uruguaiana, com evasão imediata em direção ao Campo de Santana, aproveitando a densidade do fluxo de pedestres no fim da tarde. Observou-se atuação de duplas, abordagem por aproximação lateral e dispersão pelas galerias comerciais. Recomenda-se presença ostensiva a pé no eixo do calçadão entre 16h e 20h.',
      confidence: 'media',
    },
    {
      kind: 'disque',
      label: 'Disque Denúncia — relato anônimo',
      docId: 'DD-2026-04412',
      quote:
        'os ladrões agem em dupla perto da estação, pegam celular e somem na multidão do calçadão',
      fullText:
        'Denúncia anônima registrada no Disque Denúncia (protocolo DD-2026-04412): "os ladrões agem em dupla perto da estação, pegam celular e somem na multidão do calçadão. É sempre no fim da tarde quando tá cheio." Categoria atribuída: furto a transeunte. Localização aproximada informada: entorno da Rua Uruguaiana.',
      location: { lat: -22.906, lon: -43.181 },
      confidence: 'media',
    },
    {
      kind: 'quantitativo',
      label: 'Concentração de furtos a transeunte',
      recordCount: 472,
      confidence: 'alta',
    },
  ],
  warnings: [
    'A dinâmica criminal combina fonte qualitativa (denúncia, inteligência) com a mancha quantitativa. Trate como hipótese de trabalho a ser validada em campo.',
  ],
  technicalDetail:
    'Recuperação por similaridade nos trechos de RI-017-2026 e em denúncias do Disque Denúncia categorizadas como furto/roubo a transeunte na área 20.',
}

const provCameras: Provenance = {
  rationale:
    'Contagem das câmeras cadastradas (CIVITAS/COR) dentro do polígono da área. Há trechos com registro de crime e sem cobertura próxima, sinalizados como lacuna no painel de coincidências.',
  confidence: 'alta',
  sources: [
    {
      kind: 'camera',
      label: 'Câmeras cadastradas na área',
      recordCount: 14,
      confidence: 'alta',
    },
  ],
  technicalDetail: 'Fonte: cameras_areas_fm, área 20. 14 ativas. Raio de cobertura assumido: 80 m.',
}

const provResumo1: Provenance = {
  rationale:
    'O diagnóstico de "o que" combina o tipo predominante de crime (furto a transeunte) com a sua participação no total da área.',
  confidence: 'alta',
  sources: [
    { kind: 'quantitativo', label: 'Distribuição por tipo de crime', recordCount: 1284, confidence: 'alta' },
  ],
}
const provResumo2: Provenance = {
  rationale:
    'O diagnóstico de "quando" usa o pico da matriz temporal: fim de tarde dos dias úteis.',
  confidence: 'alta',
  sources: [
    { kind: 'quantitativo', label: 'Matriz temporal de ocorrências', recordCount: 1190, confidence: 'alta' },
  ],
}
const provResumo3: Provenance = {
  rationale:
    'O diagnóstico de "onde" aponta o eixo do calçadão da Uruguaiana, onde a mancha criminal coincide com circulação intensa de pedestres e fatores urbanos.',
  confidence: 'media',
  sources: [
    { kind: 'quantitativo', label: 'Mancha criminal (concentração)', recordCount: 812, confidence: 'alta' },
    { kind: 'fator', label: 'Fatores urbanos no eixo do calçadão', recordCount: 6, confidence: 'media' },
  ],
}
const provResumo4: Provenance = {
  rationale:
    'O diagnóstico de "como" sintetiza o modo de agir descrito na inteligência e nas denúncias: duplas, abordagem a pé, fuga pela multidão.',
  confidence: 'media',
  sources: [
    {
      kind: 'relint',
      label: 'RELINT RI-017/2026',
      docId: 'RI-017-2026',
      quote: 'atuação de duplas, abordagem por aproximação lateral e dispersão pelas galerias comerciais',
      fullText:
        'RELATÓRIO DE INTELIGÊNCIA RI-017/2026. (...) Observou-se atuação de duplas, abordagem por aproximação lateral e dispersão pelas galerias comerciais. Recomenda-se presença ostensiva a pé no eixo do calçadão entre 16h e 20h.',
      confidence: 'media',
    },
  ],
  warnings: ['Leitura qualitativa: validar em campo antes de decisão operacional.'],
}

// ---------------------------------------------------------------------------
// Relatório completo
// ---------------------------------------------------------------------------
export const fixtureRelatorio: Relatorio = {
  areaId: 20,
  nomeArea: 'Presidente Vargas / Central',
  periodo: { de: '2026-01-01', ate: '2026-03-31' },
  rascunho: true,

  identificacao: {
    areaFM: 20,
    nomeArea: 'Presidente Vargas / Central',
    bairros: ['Centro', 'Praça da Bandeira', 'Cidade Nova'],
    aisp: '',
    dp: '',
    bpm: '',
    baseFM: '',
    subprefeitura: '',
    influenciaGrupoCriminoso: ['Comando Vermelho (entorno)', 'Milícia (pontos isolados)'],
    trechosCriticos: 4,
    provenance: provIdentificacao,
  },

  resumoExecutivo: [
    {
      id: 'q1',
      pergunta: 'O que acontece na área?',
      diagnostico: {
        blockId: 'rb-q1',
        sectionId: 'resumo',
        status: 'gerado',
        text: 'Predomínio de furto a transeunte (celulares e bolsas), respondendo por cerca de 37% das ocorrências da área. Roubos a pessoa vêm em seguida, concentrados no mesmo eixo comercial.',
        provenance: provResumo1,
        geradoEm: '2026-04-02T09:12:00Z',
      },
      operacao: 'Patrulhamento a pé com abordagem preventiva no calçadão.',
      observacoes: 'Confirmar tipificação predominante com a DP local.',
    },
    {
      id: 'q2',
      pergunta: 'Quando acontece?',
      diagnostico: {
        blockId: 'rb-q2',
        sectionId: 'resumo',
        status: 'gerado',
        text: 'Concentração no fim de tarde dos dias úteis, com pico às quartas-feiras por volta das 18h, acompanhando o horário de maior circulação de pedestres.',
        provenance: provResumo2,
        geradoEm: '2026-04-02T09:12:00Z',
      },
      operacao: 'Janela de presença reforçada entre 16h e 20h.',
      observacoes: 'Fins de semana apresentam queda relevante.',
    },
    {
      id: 'q3',
      pergunta: 'Onde se concentra?',
      diagnostico: {
        blockId: 'rb-q3',
        sectionId: 'resumo',
        status: 'gerado',
        text: 'Eixo do calçadão da Uruguaiana e entorno da estação, onde a mancha criminal coincide com calçadas obstruídas e iluminação deficiente.',
        provenance: provResumo3,
        geradoEm: '2026-04-02T09:12:00Z',
      },
      operacao: 'Priorizar o eixo Uruguaiana–Presidente Vargas.',
      observacoes: 'Ver trechos críticos no mapa (Seção 2).',
    },
    {
      id: 'q4',
      pergunta: 'Como agem?',
      diagnostico: {
        blockId: 'rb-q4',
        sectionId: 'resumo',
        status: 'gerado',
        text: 'Atuação de duplas, abordagem a pé por aproximação lateral e fuga aproveitando a densidade de pedestres, com dispersão pelas galerias e em direção ao Campo de Santana.',
        provenance: provResumo4,
        geradoEm: '2026-04-02T09:12:00Z',
      },
      operacao: 'Posicionamento em pontos de dispersão (galerias, acessos ao Campo de Santana).',
      observacoes: 'Hipótese de inteligência: validar em campo.',
    },
  ],

  ocorrencias: {
    indicadores: {
      roubos: 812,
      furtos: 472,
      total: 1284,
      rankingEntreAreas: 2,
      variacaoPct: 6.4,
    },
    distribuicao: [
      { tipo: 'Furto a transeunte', qtd: 472, rank: 1 },
      { tipo: 'Roubo a pessoa', qtd: 388, rank: 2 },
      { tipo: 'Roubo de celular', qtd: 254, rank: 3 },
      { tipo: 'Furto em coletivo', qtd: 96, rank: 4 },
      { tipo: 'Roubo a comércio', qtd: 74, rank: 5 },
    ],
    provenance: provOcorrencias,
  },

  temporalResumo: {
    blockId: 'rb-temporal',
    sectionId: 'temporal',
    status: 'gerado',
    text: 'O risco se concentra no fim de tarde dos dias úteis. O pico ocorre às quartas-feiras por volta das 18h. A madrugada e os fins de semana apresentam incidência consistentemente baixa, o que sugere alinhar o reforço de efetivo ao horário comercial de maior fluxo.',
    provenance: provTemporal,
    geradoEm: '2026-04-02T09:15:00Z',
  },

  dinamicaCriminal: {
    blockId: 'rb-dinamica',
    sectionId: 'dinamica',
    status: 'gerado',
    text: 'A leitura combinada indica furtos e roubos praticados a pé, em duplas, valendo-se da aglomeração de pedestres no calçadão da Uruguaiana no fim da tarde. A subtração de celulares é o alvo predominante, com fuga imediata pelas galerias comerciais e evasão em direção ao Campo de Santana. A deficiência de iluminação e a obstrução de calçadas no eixo facilitam a aproximação e a dispersão.',
    provenance: provDinamica,
    geradoEm: '2026-04-02T09:18:00Z',
  },

  efetivoFM: [
    {
      blockId: 'ef-1',
      campo: 'Modelo de emprego',
      situacaoAtual: 'Viatura em ronda pelo eixo Presidente Vargas',
      sugestao: 'Efetivo a pé no calçadão da Uruguaiana',
      justificativa:
        'A maior parte dos furtos ocorre a pé, na multidão. A presença ostensiva a pé inibe a abordagem melhor que a viatura no fluxo de pedestres.',
      provenance: {
        rationale:
          'A sugestão de emprego a pé deriva do modo de agir (furto a transeunte na aglomeração) cruzado com a concentração da mancha no calçadão.',
        confidence: 'media',
        sources: [
          { kind: 'relint', label: 'RELINT RI-017/2026', docId: 'RI-017-2026', confidence: 'media' },
          { kind: 'quantitativo', label: 'Mancha de furto a transeunte', recordCount: 472, confidence: 'alta' },
        ],
        warnings: ['Sugestão de IA — a decisão final é do gestor.'],
      },
    },
    {
      blockId: 'ef-2',
      campo: 'Janela de patrulhamento',
      situacaoAtual: 'Cobertura distribuída ao longo do dia',
      sugestao: 'Reforço entre 16h e 20h, ênfase nas quartas',
      justificativa: 'Acompanha o pico temporal identificado (fim de tarde dos dias úteis).',
      provenance: {
        rationale: 'Janela derivada diretamente do pico da matriz temporal.',
        confidence: 'alta',
        sources: [{ kind: 'quantitativo', label: 'Matriz temporal', recordCount: 1190, confidence: 'alta' }],
      },
    },
    {
      blockId: 'ef-3',
      campo: 'Efetivo sugerido',
      situacaoAtual: '',
      sugestao: '6 agentes a pé no horário de pico',
      justificativa:
        'Dimensionamento preliminar considerando a extensão do eixo crítico e a restrição de 600 agentes para todas as áreas. Ajustar conforme disponibilidade.',
      provenance: {
        rationale:
          'Estimativa de efetivo a partir da extensão dos trechos críticos e da janela de pico, respeitando o teto de 600 agentes para todas as áreas.',
        confidence: 'baixa',
        sources: [
          { kind: 'quantitativo', label: 'Trechos críticos da área', recordCount: 4, confidence: 'media' },
        ],
        warnings: [
          'Dimensionamento preliminar e sensível à disponibilidade total. Requer validação do comando da FM.',
        ],
      },
    },
  ],

  fatores: {
    rows: [
      {
        fator: 'Iluminação deficiente',
        descricao: 'Trecho do calçadão com postes apagados e luminárias encobertas por vegetação.',
        orgaoResponsavel: 'RioLuz',
        qtd: 7,
        provenance: {
          rationale:
            'Fator levantado em campo e reforçado por chamados do 1746 de "poste apagado" no mesmo trecho.',
          confidence: 'media',
          sources: [
            { kind: 'fator', label: 'Levantamento de campo — iluminação', recordCount: 7, confidence: 'media' },
            { kind: 'quantitativo', label: 'Chamados 1746 (poste apagado)', recordCount: 12, confidence: 'media' },
          ],
        },
      },
      {
        fator: 'Calçada obstruída',
        descricao: 'Comércio irregular e mobiliário forçando pedestres à pista, reduzindo visibilidade.',
        orgaoResponsavel: 'SEOP',
        qtd: 5,
      },
      {
        fator: 'Vegetação encobrindo iluminação',
        descricao: 'Copa de árvores sobre luminárias no eixo Presidente Vargas.',
        orgaoResponsavel: 'Comlurb',
        qtd: 4,
      },
      {
        fator: 'Mobiliário abandonado (esconderijo)',
        descricao: 'Estruturas abandonadas próximas ao Campo de Santana usadas como refúgio.',
        orgaoResponsavel: 'Seconserva',
        qtd: 3,
      },
      {
        fator: 'Pessoas em situação de rua (pernoite)',
        descricao: 'Concentração no entorno, fator de incidência sob acompanhamento social.',
        orgaoResponsavel: 'SMAS',
        qtd: 2,
      },
    ],
    provenance: {
      rationale:
        'Os fatores urbanos vêm do levantamento de campo da área, com o órgão responsável atribuído pela matriz oficial do CompStat. Quando disponível, chamados do 1746 reforçam o fator.',
      confidence: 'media',
      sources: [
        { kind: 'fator', label: 'Levantamento de fatores urbanos da área', recordCount: 21, confidence: 'media' },
      ],
      technicalDetail: 'Fonte: fatores_urbanos (área 20) + matriz fator→órgão do briefing.',
    },
  },

  cameras: { total: 14, provenance: provCameras },

  // MatchResult com 4 coincidências (definido abaixo, reusado)
  coincidencias: {
    areaId: 20,
    scoreArea: 0,
    camadasArea: [],
    coincidencias: [],
    resumo: '',
  },

  planoAcao: [
    {
      id: 'a1',
      acao: 'Reforço de patrulhamento a pé no calçadão da Uruguaiana (16h–20h)',
      responsavel: 'Força Municipal',
      prazo: 'Imediato',
      status: 'Proposto',
      provenance: {
        rationale: 'Ação derivada do pico temporal e da concentração da mancha no eixo do calçadão.',
        confidence: 'media',
        sources: [
          { kind: 'quantitativo', label: 'Mancha + matriz temporal', recordCount: 1190, confidence: 'alta' },
          { kind: 'relint', label: 'RELINT RI-017/2026', docId: 'RI-017-2026', confidence: 'media' },
        ],
        warnings: ['Sugestão de IA — validar com o comando.'],
      },
    },
    {
      id: 'a2',
      acao: 'Recuperar iluminação pública no trecho crítico (substituir luminárias)',
      responsavel: 'RioLuz',
      prazo: '15 dias',
      status: 'Proposto',
    },
    {
      id: 'a3',
      acao: 'Remover comércio irregular que obstrui a calçada e a visibilidade',
      responsavel: 'SEOP',
      prazo: '30 dias',
      status: 'Proposto',
    },
    {
      id: 'a4',
      acao: 'Podar vegetação que encobre luminárias no eixo Presidente Vargas',
      responsavel: 'Comlurb',
      prazo: '20 dias',
      status: 'Proposto',
    },
    {
      id: 'a5',
      acao: 'Avaliar instalação de câmera no ponto cego do calçadão',
      responsavel: 'COR / CIVITAS',
      prazo: '45 dias',
      status: 'Em análise',
    },
  ],
}

// ---------------------------------------------------------------------------
// MatchResult ("bingo" de coincidências)
// ---------------------------------------------------------------------------
export const fixtureMatch: MatchResult = {
  areaId: 20,
  scoreArea: 0.82,
  camadasArea: ['mancha', 'fator', 'dinamica', 'lacuna_camera'],
  resumo:
    'A área concentra alto risco no eixo da Uruguaiana, onde mancha criminal, fatores urbanos e dinâmica criminal se sobrepõem. Um dos trechos de maior risco está sem cobertura de câmera.',
  coincidencias: [
    {
      id: 'c1',
      lat: -22.9065,
      lon: -43.181,
      score: 0.92,
      camadas: ['mancha', 'fator', 'dinamica', 'lacuna_camera'],
      nOcorrencias: 143,
      fatores: [
        { category: 'Iluminação deficiente', orgao: 'RioLuz', dist_m: 12 },
        { category: 'Calçada obstruída', orgao: 'SEOP', dist_m: 28 },
      ],
      cobertura: { camerasRaio: 0, lacuna: true },
      faccao: 'Comando Vermelho (entorno)',
      justificativa:
        'Sobreposição das quatro camadas: forte concentração de furtos, dois fatores urbanos a poucos metros, modo de agir confirmado por inteligência e ausência de câmera no raio.',
      provenance: {
        rationale:
          'Este trecho soma a maior concentração de furtos da área, dois fatores urbanos imediatos (iluminação e calçada), a dinâmica de furto a pé descrita na inteligência e a falta de cobertura por câmera. As quatro camadas coincidindo elevam a prioridade.',
        confidence: 'alta',
        sources: [
          { kind: 'quantitativo', label: 'Furtos/roubos no raio do trecho', recordCount: 143, confidence: 'alta' },
          { kind: 'fator', label: 'Iluminação deficiente (12 m)', confidence: 'media' },
          { kind: 'fator', label: 'Calçada obstruída (28 m)', confidence: 'media' },
          {
            kind: 'relint',
            label: 'RELINT RI-017/2026',
            docId: 'RI-017-2026',
            quote:
              'a maioria das subtrações ocorre a pé na altura da Uruguaiana, com evasão imediata em direção ao Campo de Santana',
            fullText:
              'RELATÓRIO DE INTELIGÊNCIA RI-017/2026 — Presidente Vargas / Campo de Santana. Síntese: a maioria das subtrações ocorre a pé na altura da Uruguaiana, com evasão imediata em direção ao Campo de Santana, aproveitando a densidade do fluxo de pedestres no fim da tarde.',
            location: { lat: -22.9065, lon: -43.181 },
            confidence: 'media',
          },
          { kind: 'camera', label: 'Sem câmera no raio de 80 m', confidence: 'alta' },
        ],
        warnings: ['Trecho prioritário com lacuna de câmera: alta exposição.'],
        technicalDetail: 'score = 0.92 (mancha 0.95, fator 0.88, dinâmica 0.80, lacuna_camera 1.0).',
      },
    },
    {
      id: 'c2',
      lat: -22.9092,
      lon: -43.1835,
      score: 0.74,
      camadas: ['mancha', 'fator', 'dinamica'],
      nOcorrencias: 96,
      fatores: [{ category: 'Vegetação encobrindo iluminação', orgao: 'Comlurb', dist_m: 18 }],
      cobertura: { camerasRaio: 2, lacuna: false },
      justificativa:
        'Concentração relevante de ocorrências com vegetação sobre a iluminação e dinâmica compatível. Há cobertura de câmera próxima.',
      provenance: {
        rationale:
          'Trecho com concentração relevante de furtos e um fator urbano de iluminação (vegetação sobre poste) a 18 m. A dinâmica de furto a pé também se aplica. Diferente do trecho c1, aqui há duas câmeras no raio, o que reduz a prioridade relativa.',
        confidence: 'media',
        sources: [
          { kind: 'quantitativo', label: 'Ocorrências no raio do trecho', recordCount: 96, confidence: 'alta' },
          { kind: 'fator', label: 'Vegetação encobrindo iluminação · Comlurb (18 m)', confidence: 'media' },
          {
            kind: 'disque',
            label: 'Disque Denúncia — relato anônimo',
            docId: 'DD-2026-04412',
            quote: 'pegam celular e somem na multidão do calçadão',
            fullText:
              'Denúncia anônima (DD-2026-04412): "os ladrões agem em dupla perto da estação, pegam celular e somem na multidão do calçadão. É sempre no fim da tarde quando tá cheio."',
            location: { lat: -22.9092, lon: -43.1835 },
            confidence: 'media',
          },
        ],
        technicalDetail: 'score = 0.74 (mancha 0.78, fator 0.70, dinâmica 0.72, cobertura ok).',
      },
    },
    {
      id: 'c3',
      lat: -22.9118,
      lon: -43.1788,
      score: 0.58,
      camadas: ['mancha', 'lacuna_camera'],
      nOcorrencias: 61,
      fatores: [],
      cobertura: { camerasRaio: 0, lacuna: true },
      justificativa:
        'Concentração moderada de ocorrências sem fator urbano mapeado, mas sem câmera no raio. Ponto cego a monitorar.',
      provenance: {
        rationale:
          'Concentração moderada de ocorrências sem fator urbano levantado nas proximidades. O ponto chama atenção pela ausência de câmera, configurando ponto cego de monitoramento.',
        confidence: 'media',
        sources: [
          { kind: 'quantitativo', label: 'Ocorrências no raio do trecho', recordCount: 61, confidence: 'alta' },
          { kind: 'camera', label: 'Sem câmera no raio de 80 m', confidence: 'alta' },
        ],
        warnings: ['Sem fator urbano mapeado: considerar novo levantamento de campo.'],
        technicalDetail: 'score = 0.58 (mancha 0.62, lacuna_camera 1.0, fator/dinâmica ausentes).',
      },
    },
    {
      id: 'c4',
      lat: -22.9081,
      lon: -43.1759,
      score: 0.41,
      camadas: ['mancha', 'dinamica'],
      nOcorrencias: 38,
      fatores: [{ category: 'Pessoas em situação de rua (pernoite)', orgao: 'SMAS', dist_m: 35 }],
      cobertura: { camerasRaio: 3, lacuna: false },
      justificativa:
        'Concentração baixa, com fator social próximo e boa cobertura de câmera. Prioridade menor.',
      provenance: {
        rationale:
          'Trecho de menor concentração, com fator social (pernoite) a 35 m sob acompanhamento da SMAS e boa cobertura de câmera. Mantido no painel para acompanhamento, com prioridade menor.',
        confidence: 'baixa',
        sources: [
          { kind: 'quantitativo', label: 'Ocorrências no raio do trecho', recordCount: 38, confidence: 'media' },
          { kind: 'fator', label: 'Pessoas em situação de rua · SMAS (35 m)', confidence: 'baixa' },
          { kind: 'cpsr', label: 'Censo de Pessoas em Situação de Rua (entorno)', confidence: 'baixa' },
        ],
        technicalDetail: 'score = 0.41 (mancha 0.45, dinâmica 0.40, cobertura ok).',
      },
    },
  ],
}

// Liga o match ao relatório
fixtureRelatorio.coincidencias = fixtureMatch

// ---------------------------------------------------------------------------
// Matriz temporal 7x24 com picos no fim de tarde dos dias úteis
// ---------------------------------------------------------------------------
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function buildTemporal(): number[][] {
  const matrix: number[][] = []
  for (let d = 0; d < 7; d++) {
    const row: number[] = []
    const isWeekday = d >= 1 && d <= 5
    for (let h = 0; h < 24; h++) {
      let v: number
      if (h < 6) v = 1 // madrugada
      else if (h < 12) v = isWeekday ? 4 + (h - 6) : 2 // manhã sobe
      else if (h < 16) v = isWeekday ? 9 : 4 // tarde
      else if (h < 20) v = isWeekday ? 16 + (h - 16) * 2 : 6 // pico fim de tarde
      else v = isWeekday ? 8 : 3 // noite desce
      // ênfase nas quartas (índice 3)
      if (d === 3 && h >= 16 && h <= 19) v += 6
      row.push(v)
    }
    matrix.push(row)
  }
  // pico explícito quarta 18h
  matrix[3][18] = 31
  // célula sem dado (sentinela -1): domingo 03h
  matrix[0][3] = -1
  return matrix
}

export const fixtureTemporal: TemporalMatrix = {
  matrix: buildTemporal(),
  dias: DIAS,
  periodoPredominante: 'Fim de tarde dos dias úteis (16h–20h)',
  diaCritico: 'Quarta-feira',
  horaCritica: 18,
  coverage: {
    Domingo: 0.97,
    Segunda: 1,
    Terça: 1,
    Quarta: 1,
    Quinta: 1,
    Sexta: 1,
    Sábado: 0.99,
  },
}

// ---------------------------------------------------------------------------
// Pacote de mapa (GeoJSON simples perto de -22.91, -43.18)
// ---------------------------------------------------------------------------
function jitter(base: number, spread: number): number {
  return base + (Math.random() - 0.5) * spread
}

function occurrencePoints(n: number) {
  const feats = []
  for (let i = 0; i < n; i++) {
    // concentra perto do eixo da Uruguaiana (c1/c2)
    const near = Math.random()
    const lon = near < 0.6 ? jitter(-43.1815, 0.006) : jitter(CENTER[0], 0.012)
    const lat = near < 0.6 ? jitter(-22.908, 0.005) : jitter(CENTER[1], 0.01)
    feats.push({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [lon, lat] as [number, number] },
      properties: { tipo: near < 0.6 ? 'furto' : 'roubo', peso: 1 },
    })
  }
  return feats
}

const areaPolygonCoords: [number, number][] = [
  [-43.196, -22.9],
  [-43.17, -22.901],
  [-43.166, -22.915],
  [-43.185, -22.92],
  [-43.198, -22.913],
  [-43.196, -22.9],
]

export const fixtureMap: MapPackage = {
  occurrences: {
    type: 'FeatureCollection',
    features: occurrencePoints(220),
  },
  areaPolygon: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [areaPolygonCoords] },
        properties: { nome: 'Área 20 — Presidente Vargas / Central' },
      },
    ],
  },
  cameras: {
    type: 'FeatureCollection',
    features: [
      { lon: -43.1838, lat: -22.9091, nome: 'Câmera Uruguaiana 1' },
      { lon: -43.1802, lat: -22.9075, nome: 'Câmera Pres. Vargas' },
      { lon: -43.1762, lat: -22.9083, nome: 'Câmera Campo de Santana' },
      { lon: -43.1789, lat: -22.9123, nome: 'Câmera Praça da Bandeira' },
      { lon: -43.1855, lat: -22.9105, nome: 'Câmera Galeria' },
    ].map((c) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [c.lon, c.lat] as [number, number] },
      properties: { nome: c.nome, status: 'ativa' },
    })),
  },
  urbanFactors: {
    type: 'FeatureCollection',
    features: [
      { lon: -43.1812, lat: -22.9067, fator: 'Iluminação deficiente', orgao: 'RioLuz' },
      { lon: -43.1818, lat: -22.9063, fator: 'Calçada obstruída', orgao: 'SEOP' },
      { lon: -43.1836, lat: -22.9093, fator: 'Vegetação encobrindo iluminação', orgao: 'Comlurb' },
      { lon: -43.1761, lat: -22.9079, fator: 'Mobiliário abandonado', orgao: 'Seconserva' },
    ].map((f) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [f.lon, f.lat] as [number, number] },
      properties: { fator: f.fator, orgao: f.orgao },
    })),
  },
  criticalSegments: {
    type: 'FeatureCollection',
    features: fixtureMatch.coincidencias.map((c) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [c.lon, c.lat] as [number, number] },
      properties: {
        id: c.id,
        score: c.score,
        justificativa: c.justificativa,
        camadas: c.camadas,
      },
    })),
  },
}

export const fixtureAreas: AreaInfo[] = Object.entries(
  // AREAS_FM importado indiretamente via relatório; listamos as 8 do seletor
  {
    2: 'Rodoviária / Terminal Gentileza',
    9: 'Metrô Botafogo / São Clemente',
    10: 'Jardim de Alah',
    11: 'Campo Grande / Calçadão',
    12: 'Rio Sul',
    14: 'Praia de Botafogo / Marquês de Abrantes',
    19: 'São Francisco Xavier / Afonso Pena',
    20: 'Presidente Vargas / Central',
  },
).map(([id, nome]) => ({
  areaId: Number(id),
  nomeArea: nome,
  totalOcorrencias: id === '20' ? 1284 : Math.round(400 + Math.random() * 900),
  scoreArea: id === '20' ? 0.82 : Math.round((0.3 + Math.random() * 0.5) * 100) / 100,
}))

// ---------------------------------------------------------------------------
// Resumo das áreas para a página inicial (valores reais de gold/area_brief.csv,
// já ordenados por urgência). Permite renderizar a home sem backend.
// ---------------------------------------------------------------------------
export const fixtureAreasOverview: AreaResumo[] = [
  { areaId: 20, nomeArea: 'Presidente Vargas - Campo de Santana - Central do Brasil - Cinelândia', ranking: 1, totalOcorrencias: 4011, nDisque: 231, nCameras: 230, nPsrCpsr: 1883, picoDiaSemana: 'Sexta', picoHora: 20, principalFator: 'Pessoas em situação de rua' },
  { areaId: 2, nomeArea: 'Rodoviária - Terminal Gentileza - Estação Leopoldina', ranking: 2, totalOcorrencias: 1974, nDisque: 134, nCameras: 310, nPsrCpsr: 333, picoDiaSemana: 'Quinta', picoHora: 20, principalFator: 'Área mal iluminada com circulação de pedestres' },
  { areaId: 19, nomeArea: 'Estações São Francisco Xavier - Afonso Pena', ranking: 3, totalOcorrencias: 1507, nDisque: 146, nCameras: 60, nPsrCpsr: 222, picoDiaSemana: 'Terça', picoHora: 20, principalFator: 'Vegetação encobrindo iluminação pública' },
  { areaId: 14, nomeArea: 'Praia de Botafogo - Rua Marquês de Abrantes', ranking: 4, totalOcorrencias: 1138, nDisque: 62, nCameras: 150, nPsrCpsr: 158, picoDiaSemana: 'Terça', picoHora: 21, principalFator: 'Área mal iluminada com circulação de pedestres' },
  { areaId: 9, nomeArea: 'Metrô Botafogo - Rua São Clemente - Rua Voluntários da Pátria', ranking: 5, totalOcorrencias: 821, nDisque: 86, nCameras: 80, nPsrCpsr: 255, picoDiaSemana: 'Sábado', picoHora: 23, principalFator: 'Vegetação encobrindo iluminação pública' },
  { areaId: 12, nomeArea: 'Rio Sul', ranking: 6, totalOcorrencias: 457, nDisque: 58, nCameras: 50, nPsrCpsr: 37, picoDiaSemana: 'Quarta', picoHora: 19, principalFator: 'Área mal iluminada com circulação de pedestres' },
  { areaId: 10, nomeArea: 'Jardim de Alah', ranking: 7, totalOcorrencias: 298, nDisque: 17, nCameras: 30, nPsrCpsr: 100, picoDiaSemana: 'Terça', picoHora: 20, principalFator: 'Pessoas em situação de rua' },
  { areaId: 11, nomeArea: 'Campo Grande: Estação de Trem - Calçadão', ranking: 8, totalOcorrencias: 294, nDisque: 38, nCameras: 45, nPsrCpsr: 181, picoDiaSemana: 'Terça', picoHora: 22, principalFator: 'Ponto de retenção do tráfego' },
]
