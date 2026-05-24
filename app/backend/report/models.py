"""Contrato compartilhado do backend (Pydantic) — espelhado em frontend/src/api/types.ts.

Toda seção do relatório (determinística ou de IA) carrega uma `Provenance`, para que o
frontend exiba a transparência de forma uniforme. O backend é a fonte de verdade das
`sources`; a IA apenas redige `rationale`/`confidence`/`warnings`.

Python 3.9: usa Optional[...]/List[...] (sem o operador `|`).
"""
from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

Confianca = Literal["alta", "media", "baixa"]
TipoFonte = Literal["quantitativo", "relint", "disque", "fator", "camera", "dominio", "cpsr"]
CamadaMatch = Literal["mancha", "fator", "dinamica", "lacuna_camera"]
StatusBloco = Literal["gerado", "nao_gerado", "erro", "dados_indisponiveis"]


# ---------- Transparência ----------
class SourceCitation(BaseModel):
    kind: TipoFonte
    label: str                                  # rótulo de negócio
    quote: Optional[str] = None                 # trecho LITERAL (relint/disque), já despersonalizado
    fullText: Optional[str] = None              # texto completo p/ popover com o trecho realçado
    recordCount: Optional[int] = None           # quando quantitativo
    docId: Optional[str] = None
    location: Optional[Dict[str, float]] = None  # {"lat":.., "lon":..} -> "ver no mapa"
    confidence: Optional[Confianca] = None


class Provenance(BaseModel):
    rationale: str                              # "por que/como" — LINGUAGEM DE GESTOR, sem jargão
    confidence: Confianca
    sources: List[SourceCitation] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    technicalDetail: Optional[str] = None       # drill-down opcional, legível (sem SQL/JSON cru)


class AiBlock(BaseModel):
    blockId: str
    sectionId: str
    status: StatusBloco = "nao_gerado"
    text: str = ""
    editedByHuman: bool = False
    provenance: Optional[Provenance] = None
    geradoEm: Optional[str] = None


# ---------- Match ("bingo") ----------
class FatorProximo(BaseModel):
    category: str
    orgao: Optional[str] = None
    dist_m: float


class Cobertura(BaseModel):
    camerasRaio: int
    lacuna: bool


class Coincidencia(BaseModel):
    id: str
    lat: float
    lon: float
    score: float
    camadas: List[CamadaMatch]
    nOcorrencias: int
    fatores: List[FatorProximo] = Field(default_factory=list)
    cobertura: Cobertura
    faccao: Optional[str] = None
    justificativa: str
    provenance: Provenance


class MatchResult(BaseModel):
    areaId: int
    scoreArea: float
    camadasArea: List[str]
    coincidencias: List[Coincidencia] = Field(default_factory=list)
    resumo: str = ""


# ---------- Seções determinísticas ----------
class Periodo(BaseModel):
    de: str
    ate: str


class Identificacao(BaseModel):
    areaFM: int
    nomeArea: str
    bairros: List[str] = Field(default_factory=list)
    # campos não presentes nos dados — editáveis pelo gestor (não inventar)
    aisp: str = ""
    dp: str = ""
    bpm: str = ""
    baseFM: str = ""
    subprefeitura: str = ""
    influenciaGrupoCriminoso: List[str] = Field(default_factory=list)
    trechosCriticos: Optional[int] = None
    provenance: Provenance


class IndicadoresPeriodo(BaseModel):
    roubos: int
    furtos: Optional[int] = None                # dados só têm roubo
    total: int
    rankingEntreAreas: int
    variacaoPct: Optional[float] = None          # sem período anterior


class DistribuicaoTipo(BaseModel):
    tipo: str
    qtd: int
    rank: int


class Ocorrencias(BaseModel):
    indicadores: IndicadoresPeriodo
    distribuicao: List[DistribuicaoTipo] = Field(default_factory=list)
    provenance: Provenance


class FatorOrgao(BaseModel):
    fator: str
    descricao: str = ""
    orgaoResponsavel: Optional[str] = None
    qtd: int
    provenance: Optional[Provenance] = None


class FatoresIncidencia(BaseModel):
    rows: List[FatorOrgao] = Field(default_factory=list)
    provenance: Provenance


class Cameras(BaseModel):
    total: int
    provenance: Provenance


class PerguntaNorteadora(BaseModel):
    id: str                                      # q1..q4
    pergunta: str
    diagnostico: AiBlock                         # resposta gerada por IA (com proveniência)
    operacao: str = ""                           # editável
    observacoes: str = ""                        # editável


class EfetivoRow(BaseModel):
    blockId: str
    campo: str                                   # ex.: "Horário de Cobertura"
    situacaoAtual: str = ""
    sugestao: str = ""
    justificativa: str = ""
    provenance: Optional[Provenance] = None


class AcaoRow(BaseModel):
    id: str
    acao: str
    responsavel: Optional[str] = None
    prazo: str = ""
    status: str = "proposto"
    provenance: Optional[Provenance] = None


class TemporalMatrix(BaseModel):
    matrix: List[List[int]]                      # 7 x 24
    dias: List[str]
    periodoPredominante: str = ""
    diaCritico: str = ""
    horaCritica: Optional[int] = None
    coverage: Dict[str, int] = Field(default_factory=dict)  # {"totalRegistros":.., "semHora":..}


class AreaInfo(BaseModel):
    areaId: int
    nomeArea: str
    totalOcorrencias: int
    scoreArea: Optional[float] = None


class AreaResumo(BaseModel):
    """Resumo de área para a página inicial (cards por urgência)."""
    areaId: int
    nomeArea: str
    ranking: int                                 # ranking_ocorrencias (1 = mais urgente)
    totalOcorrencias: int
    nDisque: int
    nCameras: int
    nPsrCpsr: int
    picoDiaSemana: str = ""
    picoHora: Optional[int] = None
    principalFator: Optional[str] = None         # fator urbano de maior incidência


class Relatorio(BaseModel):
    areaId: int
    nomeArea: str
    periodo: Periodo
    rascunho: bool = True
    identificacao: Identificacao
    resumoExecutivo: List[PerguntaNorteadora] = Field(default_factory=list)
    ocorrencias: Ocorrencias
    temporalResumo: AiBlock
    dinamicaCriminal: AiBlock
    efetivoFM: List[EfetivoRow] = Field(default_factory=list)
    fatores: FatoresIncidencia
    cameras: Cameras
    coincidencias: MatchResult
    planoAcao: List[AcaoRow] = Field(default_factory=list)
