"""Match ("bingo"): cruza mancha criminal x fatores urbanos x dinâmica x cobertura.

Estratégia:
  1. Macro (área): quais camadas existem e uma nota agregada simples.
  2. Espacial: agrupa as ocorrências numa GRADE (~0.0015°), pega as células mais
     densas e, para cada uma, mede via DuckDB spatial (raio 150 m) quantos fatores
     e câmeras existem ao redor. Monta uma `Coincidencia` com proveniência.

DEGRADE: se não há dinâmica estruturada (arquivo ausente ou área sem registros),
a camada "dinamica" simplesmente não entra.
"""
from __future__ import annotations

import math
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

import duckdb

from ..data import duck as D
from ..report import models as M
from . import score as scoremod

# Grade de agrupamento (~0.0015° ≈ 150 m em lat/lon no Rio).
GRID_STEP = 0.0015
# Raio de proximidade para fatores/câmeras (metros) — via ST_Distance_Sphere.
RAIO_M = 150.0
# Quantas células densas viram coincidências.
TOP_CELULAS = 12

_AVISO_INDICIO = "Disque/RELINT são indícios, não fatos."


# ---------------------------------------------------------------------------
# Conexão espacial própria (deps._get_con é privado; aqui abrimos a nossa).
# ---------------------------------------------------------------------------


def _spatial_con() -> duckdb.DuckDBPyConnection:
    con = duckdb.connect(database=":memory:")
    con.execute("INSTALL spatial; LOAD spatial;")
    return con


def _cell_key(lat: float, lon: float) -> Tuple[int, int]:
    return (int(math.floor(lat / GRID_STEP)), int(math.floor(lon / GRID_STEP)))


def _cell_center(ky: int, kx: int) -> Tuple[float, float]:
    return ((ky + 0.5) * GRID_STEP, (kx + 0.5) * GRID_STEP)


# ---------------------------------------------------------------------------
# Camadas macro da área
# ---------------------------------------------------------------------------


def _camadas_area(
    tem_fator: bool, dinamica: Optional[List[dict]]
) -> List[str]:
    camadas = ["mancha"]
    if tem_fator:
        camadas.append("fator")
    if dinamica:
        camadas.append("dinamica")
    return camadas


# ---------------------------------------------------------------------------
# Proximidade espacial (raio 150 m) para uma âncora
# ---------------------------------------------------------------------------


def _fatores_proximos(
    con: duckdb.DuckDBPyConnection, lat: float, lon: float
) -> List[M.FatorProximo]:
    rows = con.execute(
        "SELECT category, orgao_responsavel, "
        "ST_Distance_Sphere(ST_Point(lon, lat), ST_Point(?, ?)) AS dist_m "
        "FROM fat WHERE ST_Distance_Sphere(ST_Point(lon, lat), ST_Point(?, ?)) <= ? "
        "ORDER BY dist_m",
        [lon, lat, lon, lat, RAIO_M],
    ).fetchall()
    return [
        M.FatorProximo(category=r[0], orgao=r[1], dist_m=round(float(r[2]), 1))
        for r in rows
    ]


def _cameras_no_raio(
    con: duckdb.DuckDBPyConnection, lat: float, lon: float
) -> int:
    row = con.execute(
        "SELECT COUNT(*) FROM cam "
        "WHERE ST_Distance_Sphere(ST_Point(lon, lat), ST_Point(?, ?)) <= ?",
        [lon, lat, RAIO_M],
    ).fetchone()
    return int(row[0]) if row else 0


# ---------------------------------------------------------------------------
# Proveniência de uma coincidência
# ---------------------------------------------------------------------------


def _afirmacao_dinamica(dinamica: Optional[List[dict]]) -> Optional[dict]:
    """Pega uma afirmação de dinâmica relevante (preferindo modalidade/MO, conf alta)."""
    if not dinamica:
        return None
    prioridade = {"modalidade_criminal": 0, "modus_operandi": 1}
    melhor = None
    melhor_rank = 99
    for d in dinamica:
        if not d.get("trecho_fonte"):
            continue
        rank = prioridade.get(d.get("campo"), 5)
        if d.get("confianca") == "alta":
            rank -= 0.5
        if rank < melhor_rank:
            melhor_rank = rank
            melhor = d
    return melhor or (dinamica[0] if dinamica else None)


def _build_provenance(
    n_ocorr: int,
    fatores: List[M.FatorProximo],
    afirm_dinamica: Optional[dict],
    faccao: Optional[str],
    justificativa: str,
) -> M.Provenance:
    sources: List[M.SourceCitation] = []

    # 1) Quantitativo (a mancha).
    sources.append(
        M.SourceCitation(
            kind="quantitativo",
            label="roubos num raio de 150 m",
            recordCount=n_ocorr,
        )
    )

    # 2) Fator urbano (causa removível), se houver.
    if fatores:
        f0 = fatores[0]
        rotulo = f0.category
        if f0.orgao:
            rotulo += " (%s)" % f0.orgao
        sources.append(
            M.SourceCitation(
                kind="fator",
                label=rotulo,
                recordCount=len(fatores),
            )
        )

    # 3) Dinâmica (RELINT/Disque) — trecho literal + docId.
    warnings: List[str] = []
    if afirm_dinamica is not None:
        fonte = (afirm_dinamica.get("fonte_tipo") or "").upper()
        kind = "disque" if fonte == "DISQUE_DENUNCIA" else "relint"
        sources.append(
            M.SourceCitation(
                kind=kind,
                label="dinâmica criminal relatada",
                quote=afirm_dinamica.get("trecho_fonte"),
                docId=afirm_dinamica.get("doc_id"),
                confidence=afirm_dinamica.get("confianca"),
            )
        )
        warnings.append(_AVISO_INDICIO)

    # 4) Domínio territorial (facção), se houver.
    if faccao:
        sources.append(
            M.SourceCitation(
                kind="dominio",
                label="domínio territorial: %s" % faccao,
            )
        )

    # Confiança: alta se >= 2 camadas de dados duros (mancha conta; fator conta).
    dados_duros = 1 + (1 if fatores else 0) + (1 if faccao else 0)
    confidence = "alta" if dados_duros >= 2 else "media"

    return M.Provenance(
        rationale=justificativa,
        confidence=confidence,
        sources=sources,
        warnings=warnings,
        technicalDetail=(
            "ocorrências da área agrupadas em grade de ~150 m; "
            "fatores e câmeras contados num raio de 150 m da célula"
        ),
    )


def _justificativa(
    n_ocorr: int,
    fatores: List[M.FatorProximo],
    lacuna: bool,
    faccao: Optional[str],
    tem_dinamica: bool,
) -> str:
    partes = ["Concentração de %d roubos num raio de 150 m" % n_ocorr]
    if fatores:
        nomes = ", ".join(sorted({f.category for f in fatores})[:3])
        partes.append("com fatores urbanos no entorno (%s)" % nomes)
    if lacuna:
        partes.append("sem cobertura de câmera no raio")
    if faccao:
        partes.append("em território de influência de %s" % faccao)
    if tem_dinamica:
        partes.append("corroborada por relato de inteligência/denúncia")
    return "; ".join(partes) + "."


# ---------------------------------------------------------------------------
# Principal
# ---------------------------------------------------------------------------


def compute_match(area_id: int) -> M.MatchResult:
    ocorrencias = D.ocorrencias_geo(area_id)
    fatores_pts = D.fatores_geo(area_id)
    cameras_pts = D.cameras_geo(area_id)
    dinamica = D.dinamica_estruturada(area_id)
    faccoes_area = D.dominio_da_area(area_id) or D.identificacao(area_id).get("faccoes", [])
    faccao_area = faccoes_area[0] if faccoes_area else None
    tem_dinamica = bool(dinamica)
    tem_fator_area = len(fatores_pts) > 0

    camadas_area = _camadas_area(tem_fator_area, dinamica)
    afirm_dinamica = _afirmacao_dinamica(dinamica)

    # --- Agrupa ocorrências em grade ---
    celulas: Dict[Tuple[int, int], int] = defaultdict(int)
    for o in ocorrencias:
        celulas[_cell_key(o["lat"], o["lon"])] += 1

    coincidencias: List[M.Coincidencia] = []

    if celulas:
        max_n = max(celulas.values())
        # top células por densidade
        top = sorted(celulas.items(), key=lambda kv: kv[1], reverse=True)[:TOP_CELULAS]

        con = _spatial_con()
        try:
            con.register("fat_df", _to_arrow(fatores_pts))
            con.register("cam_df", _to_arrow(cameras_pts))
            con.execute("CREATE TEMP TABLE fat AS SELECT * FROM fat_df")
            con.execute("CREATE TEMP TABLE cam AS SELECT * FROM cam_df")

            for i, ((ky, kx), n_ocorr) in enumerate(top):
                lat, lon = _cell_center(ky, kx)
                fatores = _fatores_proximos(con, lat, lon)
                cams = _cameras_no_raio(con, lat, lon)
                lacuna = cams == 0
                densidade_norm = n_ocorr / max_n if max_n else 0.0

                nota = scoremod.score(
                    densidade_norm=densidade_norm,
                    tem_fator=bool(fatores),
                    tem_dinamica=tem_dinamica,
                    lacuna_camera=lacuna,
                )

                camadas: List[str] = ["mancha"]
                if fatores:
                    camadas.append("fator")
                if tem_dinamica:
                    camadas.append("dinamica")
                if lacuna:
                    camadas.append("lacuna_camera")

                justif = _justificativa(
                    n_ocorr, fatores, lacuna, faccao_area, tem_dinamica
                )
                prov = _build_provenance(
                    n_ocorr, fatores, afirm_dinamica, faccao_area, justif
                )

                coincidencias.append(
                    M.Coincidencia(
                        id="%d-c%d" % (area_id, i + 1),
                        lat=round(lat, 6),
                        lon=round(lon, 6),
                        score=round(nota, 2),
                        camadas=camadas,
                        nOcorrencias=n_ocorr,
                        fatores=fatores,
                        cobertura=M.Cobertura(camerasRaio=cams, lacuna=lacuna),
                        faccao=faccao_area,
                        justificativa=justif,
                        provenance=prov,
                    )
                )
        finally:
            con.close()

    # score da área = média simples das coincidências (ou 0).
    if coincidencias:
        score_area = round(sum(c.score for c in coincidencias) / len(coincidencias), 2)
    else:
        score_area = 0.0

    resumo = _resumo(area_id, coincidencias, camadas_area, tem_dinamica)

    return M.MatchResult(
        areaId=area_id,
        scoreArea=score_area,
        camadasArea=camadas_area,
        coincidencias=coincidencias,
        resumo=resumo,
    )


def _resumo(
    area_id: int,
    coincidencias: List[M.Coincidencia],
    camadas_area: List[str],
    tem_dinamica: bool,
) -> str:
    if not coincidencias:
        return "Sem segmentos críticos identificados (ocorrências sem geolocalização)."
    top = max(coincidencias, key=lambda c: c.score)
    n_lacuna = sum(1 for c in coincidencias if c.cobertura.lacuna)
    n_fator = sum(1 for c in coincidencias if any(cd == "fator" for cd in c.camadas))
    partes = [
        "%d segmentos críticos identificados" % len(coincidencias),
        "%d com fator urbano no entorno" % n_fator,
        "%d sem cobertura de câmera" % n_lacuna,
    ]
    if tem_dinamica:
        partes.append("dinâmica criminal corroborada por inteligência/denúncia")
    txt = "; ".join(partes)
    txt += ". Segmento de maior prioridade: %.1f de 10 com %d roubos." % (
        top.score,
        top.nOcorrencias,
    )
    return txt


# ---------------------------------------------------------------------------
# util: lista de dicts -> tabela registrável no DuckDB (via pandas)
# ---------------------------------------------------------------------------


def _to_arrow(rows: List[dict]):
    import pandas as pd

    if not rows:
        # garante colunas esperadas mesmo vazio
        return pd.DataFrame(
            {"lat": [], "lon": [], "category": [], "orgao_responsavel": []}
        )
    df = pd.DataFrame(rows)
    if "orgao" in df.columns and "orgao_responsavel" not in df.columns:
        df = df.rename(columns={"orgao": "orgao_responsavel"})
    if "orgao_responsavel" not in df.columns:
        df["orgao_responsavel"] = None
    return df
