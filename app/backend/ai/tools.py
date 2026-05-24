"""Ferramentas do copiloto para a API Anthropic (Trilha 2).

Cada ferramenta expõe uma CONSULTA pré-aprovada sobre a área (baseada em
`duck.ALLOWED_QUERIES` + match). NUNCA aceitamos SQL livre nem repassamos SQL/JSON cru ao
modelo ou à UI — só dados de negócio e rótulos legíveis.

`area_fm_id` é SEMPRE fixado pelo servidor: o modelo não o fornece (e se fornecer, é ignorado).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

# Interface da Trilha 1 (não bloquear se ainda não existir).
try:
    from ..data import duck
except Exception:  # pragma: no cover
    duck = None  # type: ignore

try:
    from ..match import engine
except Exception:  # pragma: no cover
    engine = None  # type: ignore


# --------------------------------------------------------------------------- catálogo de tools
# Mapeia o nome da ferramenta (exposto ao modelo) -> função do duck + descrição de negócio.
# Mantemos um catálogo curado: o modelo só enxerga consultas seguras e sem parâmetros livres.
_CATALOGO = {
    "consultar_ocorrencias": {
        "duck": "indicadores",
        "description": (
            "Consulta os indicadores de ocorrências registradas na área (total, ranking entre "
            "áreas e período). Use para responder 'quantos casos', 'qual o volume', 'como se "
            "compara com outras áreas'."
        ),
    },
    "consultar_distribuicao_por_tipo": {
        "duck": "distribuicao_tipo",
        "description": (
            "Consulta a distribuição das ocorrências por tipo de crime na área (ranking dos tipos "
            "mais frequentes). Use para 'qual o principal crime', 'que tipos predominam'."
        ),
    },
    "consultar_padrao_temporal": {
        "duck": "matriz_temporal",
        "description": (
            "Consulta o padrão de ocorrências por dia da semana e horário (pico temporal). Use "
            "para 'qual o horário de pico', 'que dia concentra mais casos', 'quando ocorre'."
        ),
    },
    "consultar_fatores_urbanos": {
        "duck": "fatores_por_orgao",
        "description": (
            "Consulta os fatores do ambiente urbano da área (ex.: iluminação, descarte irregular) "
            "e o órgão responsável por cada um. Use para 'que fatores contribuem', 'quem deve agir'."
        ),
    },
    "consultar_relatos_disque": {
        "duck": "disque_amostra",
        "description": (
            "Consulta uma amostra de relatos do Disque Denúncia da área (texto livre, já "
            "despersonalizado). São INDÍCIOS de inteligência, não fatos. Use para entender a "
            "dinâmica relatada pela população."
        ),
    },
    "consultar_dinamica_extraida": {
        "duck": "dinamica_estruturada",
        "description": (
            "Consulta as afirmações já estruturadas sobre a dinâmica criminal (modus operandi, "
            "rotas de fuga, receptação, deslocamento do autor), extraídas de RELINTs e do Disque. "
            "Cada afirmação é um indício com trecho-fonte. Pode não estar disponível para a área."
        ),
    },
    "consultar_coincidencias": {
        "duck": None,  # vem do engine, não do duck
        "description": (
            "Consulta as coincidências espaciais da área: onde a concentração de ocorrências "
            "(mancha criminal) se sobrepõe a fatores urbanos, câmeras ou lacunas de cobertura. "
            "Use para 'onde estão os pontos críticos', 'há lacuna de câmera'."
        ),
    },
}


def definir_tools() -> List[Dict[str, Any]]:
    """Schemas das ferramentas no formato da API Anthropic (sem parâmetros livres)."""
    tools: List[Dict[str, Any]] = []
    for nome, cfg in _CATALOGO.items():
        tools.append(
            {
                "name": nome,
                "description": cfg["description"],
                # Sem parâmetros: a área é fixada pelo servidor; as consultas são pré-definidas.
                "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
            }
        )
    return tools


# --------------------------------------------------------------------------- execução
def _erro(nome: str, msg: str) -> Dict[str, Any]:
    return {"ok": False, "tool": nome, "erro": msg}


def executar_tool(nome: str, area_id: int, args: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Executa a consulta pré-aprovada para a área fixada. Devolve dict de negócio (sem SQL/JSON cru)."""
    if nome not in _CATALOGO:
        return _erro(nome, "Consulta não reconhecida.")

    if nome == "consultar_coincidencias":
        if engine is None:
            return _erro(nome, "Camada de coincidências ainda não disponível.")
        try:
            mr = engine.compute_match(area_id)
        except Exception:
            return _erro(nome, "Não foi possível consultar as coincidências da área.")
        if mr is None:
            return {"ok": True, "tool": nome, "resultado": {"coincidencias": [], "scoreArea": None}}
        coinc = getattr(mr, "coincidencias", []) or []
        # Resumo legível por coincidência (sem despejar o objeto cru).
        resumo = []
        for c in coinc[:20]:
            resumo.append(
                {
                    "nOcorrencias": getattr(c, "nOcorrencias", None),
                    "fatores": [getattr(f, "category", None) for f in (getattr(c, "fatores", []) or [])],
                    "lacunaCamera": bool(getattr(getattr(c, "cobertura", None), "lacuna", False)),
                    "justificativa": getattr(c, "justificativa", ""),
                }
            )
        return {
            "ok": True,
            "tool": nome,
            "resultado": {
                "scoreArea": getattr(mr, "scoreArea", None),
                "totalCoincidencias": len(coinc),
                "coincidencias": resumo,
                "resumo": getattr(mr, "resumo", ""),
            },
        }

    # Demais ferramentas -> duck.
    if duck is None:
        return _erro(nome, "Camada de dados ainda não disponível.")
    fn_name = _CATALOGO[nome]["duck"]
    fn = getattr(duck, fn_name, None)
    if fn is None:
        return _erro(nome, "Consulta indisponível na camada de dados.")
    try:
        resultado = fn(area_id)
    except Exception:
        return _erro(nome, "Não foi possível executar a consulta nesta área.")
    if resultado is None:
        # dinamica_estruturada pode legitimamente ser None (extração não executada).
        if nome == "consultar_dinamica_extraida":
            return {
                "ok": True, "tool": nome, "resultado": None,
                "observacao": "A leitura dos textos de inteligência ainda não foi processada para esta área.",
            }
        return {"ok": True, "tool": nome, "resultado": None}
    return {"ok": True, "tool": nome, "resultado": resultado}


# --------------------------------------------------------------------------- rótulo amigável
def _n_from(resultado: Any) -> Optional[int]:
    if isinstance(resultado, dict):
        for k in ("total", "totalRegistros", "recordCount", "n", "qtd", "count"):
            v = resultado.get(k)
            if isinstance(v, (int, float)):
                return int(v)
        ind = resultado.get("indicadores")
        if isinstance(ind, dict):
            return _n_from(ind)
    if isinstance(resultado, list):
        return len(resultado)
    return None


def friendly_label(nome: str, args: Optional[Dict[str, Any]], result: Dict[str, Any]) -> str:
    """Frase curta de negócio para a UI (ex.: 'Consultei os registros... e encontrei 4.011 casos.')."""
    if not result or not result.get("ok"):
        rotulos = {
            "consultar_ocorrencias": "os registros de ocorrências",
            "consultar_distribuicao_por_tipo": "a distribuição por tipo de crime",
            "consultar_padrao_temporal": "o padrão por dia e horário",
            "consultar_fatores_urbanos": "os fatores urbanos",
            "consultar_relatos_disque": "os relatos do Disque Denúncia",
            "consultar_dinamica_extraida": "a dinâmica criminal extraída",
            "consultar_coincidencias": "as coincidências espaciais",
        }
        return f"Tentei consultar {rotulos.get(nome, 'os dados da área')}, mas não há dados disponíveis no momento."

    res = result.get("resultado")
    n = _n_from(res)

    if nome == "consultar_ocorrencias":
        if n is not None:
            return f"Consultei os registros de ocorrências da área e encontrei {n:,} casos.".replace(",", ".")
        return "Consultei os indicadores de ocorrências da área."
    if nome == "consultar_distribuicao_por_tipo":
        if n:
            return f"Consultei a distribuição por tipo de crime e identifiquei {n} categorias na área."
        return "Consultei a distribuição das ocorrências por tipo de crime."
    if nome == "consultar_padrao_temporal":
        return "Consultei o padrão de ocorrências por dia da semana e horário (pico temporal)."
    if nome == "consultar_fatores_urbanos":
        if n:
            return f"Consultei os fatores do ambiente urbano e encontrei {n} fatores com órgão responsável."
        return "Consultei os fatores do ambiente urbano da área."
    if nome == "consultar_relatos_disque":
        if n:
            return f"Consultei uma amostra de {n} relatos do Disque Denúncia (indícios) da área."
        return "Consultei os relatos do Disque Denúncia da área (indícios)."
    if nome == "consultar_dinamica_extraida":
        if res is None:
            return "Verifiquei a dinâmica criminal extraída: a leitura dos textos de inteligência ainda não foi processada para esta área."
        if n:
            return f"Consultei a dinâmica criminal extraída e reuni {n} afirmações de inteligência (indícios) sobre a área."
        return "Consultei a dinâmica criminal extraída da área."
    if nome == "consultar_coincidencias":
        total = None
        if isinstance(res, dict):
            total = res.get("totalCoincidencias")
        if total:
            return f"Consultei as coincidências espaciais e encontrei {total} pontos críticos (mancha criminal x fatores)."
        return "Consultei as coincidências espaciais da área (mancha criminal x fatores urbanos)."

    return "Consultei os dados da área."
