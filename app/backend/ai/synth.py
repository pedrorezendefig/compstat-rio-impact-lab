"""Síntese de seções do relatório por IA (Trilha 2).

`gerar_secao(area_id, secao)` redige uma seção em linguagem de negócio usando tool use
FORÇADO + validação Pydantic + retry (padrão espelhado de normalizacao/llm/extract.py).

Princípios:
- O BACKEND é a fonte de verdade da `Provenance.sources` — montamos as citações a partir
  dos dados que realmente alimentaram o prompt, NÃO confiamos nas fontes que o modelo diz.
- Degradação elegante: sem chave -> AiBlock 'erro'; dinâmica sem extração -> 'dados_indisponiveis';
  Trilha 1 ainda sem duck/engine -> 'dados_indisponiveis' (sem stacktrace).
"""
from __future__ import annotations

import datetime as _dt
import json
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from .. import config
from ..report import models as M
from . import prompts_runtime as PR

# --- Interface da Trilha 1 (não bloquear se ainda não existir) ---
try:
    from ..data import duck
except Exception:  # pragma: no cover
    duck = None  # type: ignore

try:
    from ..match import engine
except Exception:  # pragma: no cover
    engine = None  # type: ignore

SECOES = ("resumo_executivo", "dinamica_criminal", "efetivo_fm", "plano_acao")

_AVISO_INDICIO = "Disque/RELINT são indícios, não fatos"


# ============================================================ saída estruturada do modelo
class SaidaRedacao(BaseModel):
    """Contrato da redação que o modelo DEVE devolver via tool use."""

    texto: str = Field(description="Texto pronto para o relatório, em linguagem de gestor.")
    explicacao_negocio: str = Field(
        description="Por que/como chegou a isso, em 1-2 frases (linguagem de negócio)."
    )
    confianca: Literal["alta", "media", "baixa"] = Field(
        description="alta=dado explícito/volume; media=leitura razoável; baixa=lastro fraco."
    )
    avisos: List[str] = Field(default_factory=list, description="Ressalvas honestas ao gestor.")
    fontes_citadas: List[str] = Field(
        default_factory=list, description="Rótulos das fontes efetivamente usadas."
    )


def _tool_schema() -> Dict[str, Any]:
    return {
        "name": "registrar_secao",
        "description": "Registra o texto da seção do relatório e sua fundamentação para o gestor.",
        "input_schema": SaidaRedacao.model_json_schema(),
    }


# ============================================================ chamada à Claude (tool use forçado)
def _call_claude(system_text: str, user_text: str, max_retries: int = 2) -> SaidaRedacao:
    """Tool use forçado + validação Pydantic com retry. Espelha extract.call_claude."""
    import anthropic

    client = anthropic.Anthropic(timeout=60.0, max_retries=2)
    system = [{"type": "text", "text": system_text, "cache_control": {"type": "ephemeral"}}]
    messages: List[Dict[str, Any]] = [{"role": "user", "content": user_text}]
    last_err: Optional[str] = None
    for _ in range(max_retries + 1):
        resp = client.messages.create(
            model=config.MODEL,
            max_tokens=2048,
            system=system,
            tools=[_tool_schema()],
            tool_choice={"type": "tool", "name": "registrar_secao"},
            messages=messages,
        )
        tu = next((b for b in resp.content if b.type == "tool_use"), None)
        if tu is None:
            last_err = "resposta sem tool_use"
            continue
        try:
            return SaidaRedacao.model_validate(tu.input)
        except Exception as e:  # retry: a API exige tool_result logo após o tool_use
            last_err = str(e)
            messages.append({"role": "assistant", "content": resp.content})
            messages.append(
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": tu.id,
                            "is_error": True,
                            "content": f"A saída falhou na validação: {e}. Corrija e chame a ferramenta novamente.",
                        }
                    ],
                }
            )
    raise RuntimeError(f"redação falhou após {max_retries} retries: {last_err}")


# ============================================================ helpers de dados (Trilha 1)
def _safe(fn, *a, **kw):
    """Chama uma função do duck/engine; devolve None em qualquer falha (sem propagar)."""
    if fn is None:
        return None
    try:
        return fn(*a, **kw)
    except Exception:
        return None


def _rec_count(payload: Any) -> Optional[int]:
    """Tenta extrair uma contagem de registros de estruturas variadas do duck."""
    if payload is None:
        return None
    if isinstance(payload, dict):
        for k in ("total", "totalRegistros", "recordCount", "n", "qtd", "count"):
            v = payload.get(k)
            if isinstance(v, (int, float)):
                return int(v)
        ind = payload.get("indicadores")
        if isinstance(ind, dict):
            return _rec_count(ind)
        return None
    if isinstance(payload, list):
        return len(payload)
    return None


def _fmt_periodo() -> str:
    return "2023-2024"  # janela do piloto (vide normalizacao.config)


# ============================================================ montagem de Provenance (backend)
def _src_quantitativo(label: str, n: Optional[int]) -> M.SourceCitation:
    return M.SourceCitation(kind="quantitativo", label=label, recordCount=n)


def _prov(
    *,
    rationale: str,
    confidence: str,
    sources: List[M.SourceCitation],
    warnings: List[str],
) -> M.Provenance:
    return M.Provenance(
        rationale=rationale or "Síntese a partir dos dados da área.",
        confidence=confidence if confidence in ("alta", "media", "baixa") else "media",
        sources=sources,
        warnings=warnings,
    )


def _sources_dinamica(linhas: List[dict]) -> List[M.SourceCitation]:
    """Uma citação por afirmação com trecho-fonte (relint/disque), a partir das linhas extraídas."""
    out: List[M.SourceCitation] = []
    for r in linhas:
        if r.get("declarado_ausente"):
            continue
        trecho = (r.get("trecho_fonte") or "").strip()
        if not trecho:
            continue
        fonte_tipo = (r.get("fonte_tipo") or "").lower()
        kind = "disque" if "disque" in fonte_tipo or fonte_tipo == "dd" else "relint"
        label = "Relato do Disque Denúncia" if kind == "disque" else "RELINT (inteligência)"
        conf = r.get("confianca")
        out.append(
            M.SourceCitation(
                kind=kind,  # type: ignore[arg-type]
                label=label,
                quote=trecho,
                docId=r.get("doc_id"),
                confidence=conf if conf in ("alta", "media", "baixa") else None,
            )
        )
    return out


# ============================================================ construção dos user prompts
def _ctx_quantitativo(area_id: int) -> Dict[str, Any]:
    """Reúne os blocos quantitativos e devolve {texto, sources, n_total}."""
    indicadores = _safe(getattr(duck, "indicadores", None), area_id)
    distrib = _safe(getattr(duck, "distribuicao_tipo", None), area_id)
    matriz = _safe(getattr(duck, "matriz_temporal", None), area_id)
    n_total = _rec_count(indicadores)

    partes: List[str] = []
    if indicadores is not None:
        partes.append("Indicadores da área:\n" + json.dumps(indicadores, ensure_ascii=False, default=str))
    if distrib is not None:
        partes.append("Distribuição por tipo de ocorrência:\n" + json.dumps(distrib, ensure_ascii=False, default=str))
    if matriz is not None:
        partes.append(
            "Padrão por dia da semana x horário (pico temporal):\n"
            + json.dumps(matriz, ensure_ascii=False, default=str)
        )
    sources: List[M.SourceCitation] = []
    if n_total is not None or indicadores is not None:
        sources.append(_src_quantitativo("Registros de ocorrências", n_total))
    return {"texto": "\n\n".join(partes), "sources": sources, "n_total": n_total, "matriz": matriz,
            "indicadores": indicadores, "distrib": distrib}


def _ctx_dinamica_texto(linhas: List[dict]) -> str:
    """Renderiza as afirmações extraídas como texto legível para o prompt (sem JSON cru exposto ao gestor)."""
    por_campo: Dict[str, List[dict]] = {}
    ausentes: List[str] = []
    for r in linhas:
        campo = r.get("campo") or "outros"
        if r.get("declarado_ausente"):
            if campo not in ausentes:
                ausentes.append(campo)
            continue
        por_campo.setdefault(campo, []).append(r)
    partes: List[str] = []
    for campo, itens in por_campo.items():
        linhas_txt = []
        for it in itens:
            conf = it.get("confianca") or "?"
            fonte = (it.get("fonte_tipo") or "fonte").upper()
            linhas_txt.append(
                f'  - {it.get("valor")} '
                f'(confiança {conf}; {fonte}; trecho: "{(it.get("trecho_fonte") or "").strip()}")'
            )
        partes.append(f"{campo} (afirmações com indício):\n" + "\n".join(linhas_txt))
    if ausentes:
        partes.append(
            "SEM INDÍCIOS (declarados ausentes na extração — relate como 'não há indícios'): "
            + ", ".join(sorted(set(ausentes)))
        )
    return "\n\n".join(partes)


def _match_ctx(area_id: int):
    """Devolve (texto, n_coincidencias, scoreArea) do match, ou ('', 0, None)."""
    if engine is None:
        return "", 0, None
    try:
        mr = engine.compute_match(area_id)
    except Exception:
        return "", 0, None
    if mr is None:
        return "", 0, None
    try:
        resumo = getattr(mr, "resumo", "") or ""
        coinc = getattr(mr, "coincidencias", []) or []
        score = getattr(mr, "scoreArea", None)
        descr = []
        for c in coinc[:10]:
            fatores = ", ".join(
                f"{getattr(f, 'category', '?')}"
                + (f" ({getattr(f, 'orgao', '')})" if getattr(f, "orgao", None) else "")
                for f in (getattr(c, "fatores", []) or [])
            )
            descr.append(
                f"  - coincidência: {getattr(c, 'nOcorrencias', '?')} ocorrências; "
                f"fatores próximos: {fatores or 'nenhum'}; "
                f"{getattr(c, 'justificativa', '')}"
            )
        texto = "Coincidências espaciais (mancha criminal x fatores urbanos):\n"
        texto += (resumo + "\n" if resumo else "") + "\n".join(descr)
        return texto, len(coinc), score
    except Exception:
        return "", 0, None


# ============================================================ API pública: gerar_secao
def _erro_sem_chave(secao: str, area_id: int) -> M.AiBlock:
    return M.AiBlock(
        blockId=f"{secao}:{area_id}",
        sectionId=secao,
        status="erro",
        text=(
            "A geração assistida por IA está indisponível: a chave de acesso ao modelo não está "
            "configurada no servidor. O restante do relatório (dados e mapa) segue disponível; "
            "esta seção pode ser preenchida manualmente."
        ),
    )


def _dados_indisponiveis(secao: str, area_id: int, msg: str) -> M.AiBlock:
    return M.AiBlock(
        blockId=f"{secao}:{area_id}",
        sectionId=secao,
        status="dados_indisponiveis",
        text=msg,
    )


def _now() -> str:
    return _dt.datetime.now().isoformat(timespec="seconds")


def gerar_secao(area_id: int, secao: str) -> M.AiBlock:
    """Redige uma seção (resumo_executivo trata via gerar_resumo_executivo no router)."""
    if secao not in SECOES:
        return _dados_indisponiveis(
            secao, area_id, f"Seção '{secao}' não é reconhecida para geração assistida."
        )

    if not config.has_api_key():
        return _erro_sem_chave(secao, area_id)

    blockId = f"{secao}:{area_id}"

    # ---- DINÂMICA CRIMINAL (depende da extração) ----
    if secao == "dinamica_criminal":
        linhas = _safe(getattr(duck, "dinamica_estruturada", None), area_id) if duck else None
        if linhas is None:
            return _dados_indisponiveis(
                secao,
                area_id,
                "A síntese qualitativa da dinâmica criminal depende da leitura dos textos de "
                "inteligência (RELINTs e Disque Denúncia), que ainda não foi processada para esta "
                "área. Assim que essa leitura estiver disponível, o diagnóstico qualitativo poderá "
                "ser gerado. Os dados quantitativos da área seguem disponíveis no relatório.",
            )
        if len(linhas) == 0:
            return _dados_indisponiveis(
                secao,
                area_id,
                "Não há afirmações de inteligência registradas para esta área nos RELINTs e no "
                "Disque Denúncia. Sem esses indícios, não é possível sintetizar a dinâmica criminal "
                "qualitativa — recomenda-se complementar com conhecimento de campo.",
            )
        dinamica_txt = _ctx_dinamica_texto(linhas)
        user = (
            f"Área FM {area_id} (período {_fmt_periodo()}).\n\n"
            "Afirmações já extraídas e validadas dos textos de inteligência desta área "
            "(cada uma é um INDÍCIO, com seu trecho-fonte e confiança):\n\n"
            f"{dinamica_txt}\n\n"
            "Sintetize a dinâmica criminal da área para o gestor, preservando o que está marcado "
            "como SEM INDÍCIOS como 'não há indícios'."
        )
        saida = _call_claude(PR.SYS_DINAMICA_CRIMINAL, user)
        sources = _sources_dinamica(linhas)
        warnings = list(saida.avisos)
        if _AVISO_INDICIO not in warnings:
            warnings.append(_AVISO_INDICIO)
        prov = _prov(
            rationale=saida.explicacao_negocio,
            confidence=saida.confianca,
            sources=sources,
            warnings=warnings,
        )
        return M.AiBlock(
            blockId=blockId, sectionId=secao, status="gerado",
            text=saida.texto, provenance=prov, geradoEm=_now(),
        )

    # ---- EFETIVO FM (pico temporal + deslocamento do autor) ----
    if secao == "efetivo_fm":
        qctx = _ctx_quantitativo(area_id)
        linhas_din = _safe(getattr(duck, "dinamica_estruturada", None), area_id) if duck else None
        desloc_txt = ""
        sources_din: List[M.SourceCitation] = []
        if linhas_din:
            desloc = [r for r in linhas_din if r.get("campo") == "deslocamento_autor" and not r.get("declarado_ausente")]
            if desloc:
                desloc_txt = "\n\nDeslocamento do autor (indício de inteligência):\n" + "\n".join(
                    f'  - {r.get("valor")} (trecho: "{(r.get("trecho_fonte") or "").strip()}")' for r in desloc
                )
                sources_din = _sources_dinamica(desloc)
        if not qctx["texto"] and not desloc_txt:
            return _dados_indisponiveis(
                secao, area_id,
                "Ainda não há dados suficientes (pico temporal de ocorrências) para sugerir o "
                "emprego do efetivo desta área.",
            )
        user = (
            f"Área FM {area_id} (período {_fmt_periodo()}).\n\n"
            f"{qctx['texto']}{desloc_txt}\n\n"
            "Com base no PICO TEMPORAL (dia/horário) e no DESLOCAMENTO DO AUTOR, sugira o emprego "
            "do efetivo (nº aproximado de agentes, locais, faixa de horário, dias e modalidade "
            "moto/viatura/a pé). Deixe claro que a decisão final é do gestor."
        )
        saida = _call_claude(PR.SYS_EFETIVO_FM, user)
        sources = list(qctx["sources"]) + sources_din
        warnings = list(saida.avisos)
        if sources_din and _AVISO_INDICIO not in warnings:
            warnings.append(_AVISO_INDICIO)
        prov = _prov(
            rationale=saida.explicacao_negocio, confidence=saida.confianca,
            sources=sources, warnings=warnings,
        )
        return M.AiBlock(
            blockId=blockId, sectionId=secao, status="gerado",
            text=saida.texto, provenance=prov, geradoEm=_now(),
        )

    # ---- PLANO DE AÇÃO (fatores -> órgãos + coincidências) ----
    if secao == "plano_acao":
        fatores = _safe(getattr(duck, "fatores_por_orgao", None), area_id) if duck else None
        match_txt, n_coinc, _score = _match_ctx(area_id)
        if not fatores and not match_txt:
            return _dados_indisponiveis(
                secao, area_id,
                "Ainda não há fatores urbanos nem coincidências espaciais identificados para esta "
                "área. Sem eles, não é possível propor um plano de ação fator-órgão fundamentado.",
            )
        partes = []
        if fatores:
            partes.append("Fatores urbanos por órgão responsável:\n" + json.dumps(fatores, ensure_ascii=False, default=str))
        if match_txt:
            partes.append(match_txt)
        user = (
            f"Área FM {area_id}.\n\n" + "\n\n".join(partes) + "\n\n"
            "Proponha um plano de ação ligando cada fator urbano crítico ao órgão responsável, "
            "priorizando os fatores que coincidem espacialmente com a concentração de ocorrências. "
            "Linguagem de ofício; não invente órgãos nem fatores."
        )
        saida = _call_claude(PR.SYS_PLANO_ACAO, user)
        sources: List[M.SourceCitation] = []
        n_fatores = _rec_count(fatores)
        if fatores:
            sources.append(M.SourceCitation(kind="fator", label="Fatores urbanos", recordCount=n_fatores))
        if n_coinc:
            sources.append(_src_quantitativo("Coincidências espaciais (mancha x fator)", n_coinc))
        prov = _prov(
            rationale=saida.explicacao_negocio, confidence=saida.confianca,
            sources=sources, warnings=list(saida.avisos),
        )
        return M.AiBlock(
            blockId=blockId, sectionId=secao, status="gerado",
            text=saida.texto, provenance=prov, geradoEm=_now(),
        )

    # ---- RESUMO EXECUTIVO (texto único; perguntas tratadas em gerar_resumo_executivo) ----
    # Quando chamado diretamente como seção, devolve uma síntese geral.
    qctx = _ctx_quantitativo(area_id)
    match_txt, _n, _s = _match_ctx(area_id)
    if not qctx["texto"] and not match_txt:
        return _dados_indisponiveis(
            secao, area_id, "Ainda não há dados consolidados desta área para o resumo executivo."
        )
    user = (
        f"Área FM {area_id} (período {_fmt_periodo()}).\n\n"
        f"{qctx['texto']}\n\n{match_txt}\n\n"
        "Escreva um resumo executivo do diagnóstico desta área para o gestor."
    )
    saida = _call_claude(PR.SYS_RESUMO_EXECUTIVO, user)
    prov = _prov(
        rationale=saida.explicacao_negocio, confidence=saida.confianca,
        sources=list(qctx["sources"]), warnings=list(saida.avisos),
    )
    return M.AiBlock(
        blockId=blockId, sectionId=secao, status="gerado",
        text=saida.texto, provenance=prov, geradoEm=_now(),
    )


# ============================================================ resumo executivo (4 perguntas)
def gerar_resumo_executivo(area_id: int) -> List[M.PerguntaNorteadora]:
    """Responde às 4 perguntas norteadoras (1 chamada por pergunta), cada diagnostico = AiBlock.

    Usa o mesmo tool use forçado de gerar_secao (SaidaRedacao), que é robusto; o contexto é
    montado uma vez e cada pergunta recebe um prompt focado.
    """
    perguntas = PR.PERGUNTAS_NORTEADORAS

    def _bloco(pid: str, status: str, text: str, prov: Optional[M.Provenance] = None) -> M.AiBlock:
        return M.AiBlock(
            blockId=f"resumo_executivo:{area_id}:{pid}",
            sectionId="resumo_executivo",
            status=status,  # type: ignore[arg-type]
            text=text,
            provenance=prov,
            geradoEm=_now() if status == "gerado" else None,
        )

    # Sem chave -> 4 blocos de erro.
    if not config.has_api_key():
        msg = (
            "A geração assistida por IA está indisponível: a chave de acesso ao modelo não está "
            "configurada. Esta pergunta pode ser respondida manualmente pelo gestor."
        )
        return [
            M.PerguntaNorteadora(id=p["id"], pergunta=p["pergunta"], diagnostico=_bloco(p["id"], "erro", msg))
            for p in perguntas
        ]

    # Reúne contexto (uma vez).
    qctx = _ctx_quantitativo(area_id)
    match_txt, n_coinc, _score = _match_ctx(area_id)
    fatores = _safe(getattr(duck, "fatores_por_orgao", None), area_id) if duck else None
    linhas_din = _safe(getattr(duck, "dinamica_estruturada", None), area_id) if duck else None
    din_txt = _ctx_dinamica_texto(linhas_din) if linhas_din else ""

    if not qctx["texto"] and not match_txt and not fatores and not din_txt:
        msg = (
            "Ainda não há dados consolidados desta área para responder a esta pergunta. "
            "Assim que os dados da área estiverem disponíveis, o diagnóstico poderá ser gerado."
        )
        return [
            M.PerguntaNorteadora(id=p["id"], pergunta=p["pergunta"],
                                 diagnostico=_bloco(p["id"], "dados_indisponiveis", msg))
            for p in perguntas
        ]

    blocos_ctx = [qctx["texto"]]
    if match_txt:
        blocos_ctx.append(match_txt)
    if fatores:
        blocos_ctx.append("Fatores urbanos por órgão:\n" + json.dumps(fatores, ensure_ascii=False, default=str))
    if din_txt:
        blocos_ctx.append("Dinâmica criminal (afirmações com indício de inteligência):\n" + din_txt)
    contexto = "DADOS DISPONÍVEIS:\n\n" + "\n\n".join(b for b in blocos_ctx if b)

    # Fontes da proveniência (montadas pelo backend, comuns às respostas).
    base_sources: List[M.SourceCitation] = list(qctx["sources"])
    if fatores:
        base_sources.append(M.SourceCitation(kind="fator", label="Fatores urbanos", recordCount=_rec_count(fatores)))
    if n_coinc:
        base_sources.append(_src_quantitativo("Coincidências espaciais (mancha x fator)", n_coinc))
    din_sources = _sources_dinamica(linhas_din) if linhas_din else []

    out: List[M.PerguntaNorteadora] = []
    for p in perguntas:
        pid = p["id"]
        user = (
            f"Área FM {area_id} (período {_fmt_periodo()}).\n\n"
            f"{contexto}\n\n"
            f"PERGUNTA NORTEADORA a responder: \"{p['pergunta']}\"\n"
            "Responda de forma objetiva e fundamentada nos dados acima. Se faltar dado para "
            "responder, diga isso com franqueza em vez de inventar."
        )
        try:
            saida = _call_claude(PR.SYS_RESUMO_EXECUTIVO, user)
        except Exception:
            out.append(
                M.PerguntaNorteadora(
                    id=pid, pergunta=p["pergunta"],
                    diagnostico=_bloco(
                        pid, "erro",
                        "Não foi possível gerar o diagnóstico assistido para esta pergunta. "
                        "Tente novamente; a seção pode ser preenchida manualmente pelo gestor.",
                    ),
                )
            )
            continue
        warnings = list(saida.avisos)
        # q2 (dinâmica) usa indícios -> aviso obrigatório.
        usa_indicio = pid == "q2" and bool(din_sources)
        srcs = list(base_sources)
        if usa_indicio:
            srcs = srcs + din_sources
            if _AVISO_INDICIO not in warnings:
                warnings.append(_AVISO_INDICIO)
        prov = _prov(rationale=saida.explicacao_negocio, confidence=saida.confianca, sources=srcs, warnings=warnings)
        out.append(
            M.PerguntaNorteadora(
                id=pid, pergunta=p["pergunta"], diagnostico=_bloco(pid, "gerado", saida.texto, prov)
            )
        )
    return out
