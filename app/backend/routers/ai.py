"""Router de IA (síntese) — Trilha 2 (IA & Copiloto).

Endpoints (prefixo /api adicionado no main.py):
  POST /report/{area_id}/section/{secao}/regenerate
    -> AiBlock (com Provenance) para as seções de texto;
    -> List[PerguntaNorteadora] quando secao == 'resumo_executivo'.
"""
from __future__ import annotations

from typing import List, Union

from fastapi import APIRouter

from ..ai import synth
from ..report import models as M

router = APIRouter()


@router.post(
    "/report/{area_id}/section/{secao}/regenerate",
    response_model=Union[M.AiBlock, List[M.PerguntaNorteadora]],
)
def regenerate_section(area_id: int, secao: str):
    """(Re)gera uma seção do relatório com IA. O resumo executivo retorna as 4 perguntas."""
    if secao == "resumo_executivo":
        return synth.gerar_resumo_executivo(area_id)
    return synth.gerar_secao(area_id, secao)
