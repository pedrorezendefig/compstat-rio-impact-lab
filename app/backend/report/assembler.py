"""Montagem do Relatorio completo + estado de edições humanas (em memória).

`montar_relatorio` junta as seções determinísticas (sections.py) com o match
(engine.compute_match). `aplicar_edicao` guarda overrides por (área, seção) e
`get_relatorio` remonta e aplica esses overrides.
"""
from __future__ import annotations

from typing import Any, Dict

from ..match.engine import compute_match
from . import models as M
from . import sections as S

# Estado de edição humana: REPORT_STATE[area_id][secao] = payload (dict).
REPORT_STATE: Dict[int, Dict[str, Any]] = {}

PERIODO_DE = "2023-01"
PERIODO_ATE = "2024-12"

# Seções aceitas em PATCH (mapeadas para o campo do Relatorio).
SECOES_EDITAVEIS = {
    "identificacao",
    "resumoExecutivo",
    "ocorrencias",
    "temporalResumo",
    "dinamicaCriminal",
    "efetivoFM",
    "fatores",
    "cameras",
    "planoAcao",
}


def montar_relatorio(area_id: int) -> M.Relatorio:
    ident = S.sec_identificacao(area_id)
    match = compute_match(area_id)
    # nº de segmentos críticos na identificação
    ident.trechosCriticos = len(match.coincidencias)

    return M.Relatorio(
        areaId=area_id,
        nomeArea=ident.nomeArea,
        periodo=M.Periodo(de=PERIODO_DE, ate=PERIODO_ATE),
        rascunho=True,
        identificacao=ident,
        resumoExecutivo=S.sec_resumo_executivo(area_id),
        ocorrencias=S.sec_ocorrencias(area_id),
        temporalResumo=S.sec_temporal_resumo(area_id),
        dinamicaCriminal=S.sec_dinamica_criminal(area_id),
        efetivoFM=S.sec_efetivo_fm(area_id),
        fatores=S.sec_fatores(area_id),
        cameras=S.sec_cameras(area_id),
        coincidencias=match,
        planoAcao=S.sec_plano_acao(area_id),
    )


# Aliases snake_case (sectionId usado pelo copiloto/IA) -> chave canônica camelCase.
_ALIAS_SECAO = {
    "resumo_executivo": "resumoExecutivo",
    "dinamica_criminal": "dinamicaCriminal",
    "efetivo_fm": "efetivoFM",
    "plano_acao": "planoAcao",
    "temporal_resumo": "temporalResumo",
}


def aplicar_edicao(area_id: int, secao: str, payload: dict) -> None:
    """Guarda um override de edição humana para (área, seção).

    Aceita camelCase (campos do Relatorio) e snake_case (sectionId do copiloto),
    normalizando para a chave canônica.
    """
    secao = _ALIAS_SECAO.get(secao, secao)
    if secao not in SECOES_EDITAVEIS:
        raise ValueError(
            "Seção não editável: %r (válidas: %s)"
            % (secao, ", ".join(sorted(SECOES_EDITAVEIS)))
        )
    REPORT_STATE.setdefault(area_id, {})[secao] = payload


def get_relatorio(area_id: int) -> M.Relatorio:
    """Monta o relatório e aplica os overrides de edição humana, se houver."""
    rel = montar_relatorio(area_id)
    overrides = REPORT_STATE.get(area_id, {})
    if not overrides:
        return rel

    # Aplica cada override fazendo merge no dump do relatório e revalidando.
    data = rel.model_dump()
    for secao, payload in overrides.items():
        atual = data.get(secao)
        if isinstance(atual, dict) and isinstance(payload, dict):
            atual.update(payload)
        else:
            data[secao] = payload
    return M.Relatorio.model_validate(data)
