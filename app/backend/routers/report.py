"""Router do relatório (determinístico) — Trilha 1 (Dados & Match).

  GET   /report/{id}                 -> Relatorio
  GET   /report/{id}/temporal        -> TemporalMatrix
  GET   /report/{id}/coincidencias   -> MatchResult
  PATCH /report/{id}/section/{secao} -> salva edição humana (estado em memória)
"""
from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Body, HTTPException

from ..match.engine import compute_match
from ..report import models as M
from ..report import sections as S
from ..report.assembler import aplicar_edicao, get_relatorio

router = APIRouter()


@router.get("/report/{area_id}", response_model=M.Relatorio)
def get_report(area_id: int) -> M.Relatorio:
    return get_relatorio(area_id)


@router.get("/report/{area_id}/temporal", response_model=M.TemporalMatrix)
def get_report_temporal(area_id: int) -> M.TemporalMatrix:
    return S.sec_temporal(area_id)


@router.get("/report/{area_id}/coincidencias", response_model=M.MatchResult)
def get_report_coincidencias(area_id: int) -> M.MatchResult:
    return compute_match(area_id)


@router.patch("/report/{area_id}/section/{secao}")
def patch_report_section(
    area_id: int, secao: str, payload: Dict[str, Any] = Body(...)
) -> Dict[str, bool]:
    try:
        aplicar_edicao(area_id, secao, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True}
