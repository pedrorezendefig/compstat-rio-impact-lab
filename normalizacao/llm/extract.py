"""Pipeline do extrator: lê RELINTs/Disque, chama Claude com tool use, valida e grava long CSV."""
import glob
import json
import re
import unicodedata

import docx
import pandas as pd

from .. import config as C
from . import prompts as P
from . import schema as S

MODEL = "claude-sonnet-4-6"
MAX_RELATOS_POR_AREA = 25  # teto por área no piloto (controla custo)


# ----------------------------------------------------------------- normalização de nome
def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9 ]", " ", s).lower()
    return re.sub(r"\s+", " ", s).strip()


def _match_area(nome_relint: str, areas: pd.DataFrame):
    """Casa o nome da área do RELINT com o fid do shapefile por sobreposição de tokens."""
    alvo = set(_norm(nome_relint).split())
    best, best_score = None, -1
    for _, r in areas.iterrows():
        toks = set(_norm(r["nome_subarea"]).split())
        score = len(alvo & toks)
        if score > best_score:
            best, best_score = int(r["area_fm_id"]), score
    return best


# ----------------------------------------------------------------- leitura dos RELINTs
def _is_header(text: str) -> bool:
    letters = [c for c in text if c.isalpha()]
    if not letters or len(text) > 90:
        return False
    upper_ratio = sum(c.isupper() for c in letters) / len(letters)
    return upper_ratio > 0.85


def ler_relints(areas: pd.DataFrame):
    """Retorna lista de dicts {doc_id, area_fm_id, nome_area, sub_local, texto}."""
    unidades = []
    for path in sorted(glob.glob(str(C.D_RELINTS / "*.docx"))):
        doc_id = re.search(r"RI_\d+", path)
        doc_id = doc_id.group(0) if doc_id else path.split("/")[-1]
        d = docx.Document(path)
        cells = [c.text.strip() for c in d.tables[0].columns[0].cells if c.text.strip()]
        if len(cells) < 3:
            continue
        nome_area = cells[1]
        area_fm_id = _match_area(nome_area, areas)
        # segmenta o corpo (a partir da abertura) em (sub_local -> texto)
        blocos, atual = {}, "ABERTURA"
        for cel in cells[2:]:
            if _is_header(cel):
                atual = cel
            else:
                blocos[atual] = blocos.get(atual, "") + " " + cel
        for sub_local, texto in blocos.items():
            texto = texto.strip()
            if len(texto) >= 120:  # ignora blocos sem conteúdo real
                unidades.append({
                    "doc_id": doc_id, "area_fm_id": area_fm_id,
                    "nome_area": nome_area, "sub_local": None if sub_local == "ABERTURA" else sub_local,
                    "texto": texto,
                })
    return unidades


# ----------------------------------------------------------------- preparação do Disque
TAXONOMIA_ESCOPO = ("PATRIM", "ENTORPEC", "ARMA")  # patrimônio, drogas, armas


def preparar_disque(areas: pd.DataFrame):
    """Retorna lista de dicts {doc_id, area_fm_id, nome_area, relatos[]} por área (no escopo)."""
    df = pd.read_csv(C.OUT_SILVER / "fact_disque_denuncia.csv")
    df = df[df["area_fm_id"].notna()].copy()
    df["area_fm_id"] = df["area_fm_id"].astype(int)
    # filtro de taxonomia (category = classe da denúncia)
    cat = df["category"].fillna("").str.upper()
    df = df[cat.apply(lambda c: any(t in c for t in TAXONOMIA_ESCOPO))]
    # extrai o relato de attributes_json
    df["relato"] = df["attributes_json"].apply(
        lambda j: (json.loads(j).get("relato_redacted") or "").strip() if isinstance(j, str) else "")
    df = df[df["relato"].str.len() > 20]
    fid_to_nome = dict(zip(areas["area_fm_id"], areas["nome_subarea"]))
    lotes = []
    for aid, g in df.groupby("area_fm_id"):
        relatos = g["relato"].head(MAX_RELATOS_POR_AREA).tolist()
        lotes.append({"doc_id": f"DD_area{aid}", "area_fm_id": int(aid),
                      "nome_area": fid_to_nome.get(aid), "relatos": relatos})
    return lotes


# ----------------------------------------------------------------- chamada à Claude API
def _system():
    return P.SYSTEM + "\n\nEXEMPLO:\n" + P.FEWSHOT_USER + "\n" + P.FEWSHOT_ASSISTANT_NOTE


def _tool():
    return {
        "name": "registrar_dinamica",
        "description": "Registra a dinâmica criminal estruturada e despersonalizada extraída do texto.",
        "input_schema": S.DinamicaExtraida.model_json_schema(),
    }


def call_claude(user_text: str, max_retries: int = 2):
    """Chama Claude com tool use forçado; valida via Pydantic com retry. Requer ANTHROPIC_API_KEY."""
    import anthropic

    client = anthropic.Anthropic(timeout=60.0, max_retries=2)
    system = [{"type": "text", "text": _system(), "cache_control": {"type": "ephemeral"}}]
    messages = [{"role": "user", "content": user_text}]
    last_err = None
    for _ in range(max_retries + 1):
        resp = client.messages.create(
            model=MODEL, max_tokens=2048, system=system,
            tools=[_tool()], tool_choice={"type": "tool", "name": "registrar_dinamica"},
            messages=messages,
        )
        tu = next((b for b in resp.content if b.type == "tool_use"), None)
        if tu is None:
            last_err = "resposta sem tool_use"
            continue
        try:
            return S.DinamicaExtraida.model_validate(tu.input)
        except Exception as e:  # retry: a API exige tool_result logo após o tool_use
            last_err = str(e)
            messages.append({"role": "assistant", "content": resp.content})
            messages.append({"role": "user", "content": [{
                "type": "tool_result", "tool_use_id": tu.id, "is_error": True,
                "content": f"A saída falhou na validação: {e}. Corrija e chame a ferramenta novamente.",
            }]})
    raise RuntimeError(f"extração falhou após {max_retries} retries: {last_err}")


# ----------------------------------------------------------------- validação anti-alucinação
def filtrar_citacoes(d: S.DinamicaExtraida, texto_fonte: str):
    """Remove afirmações cujo trecho_fonte não existe no texto (lastro contra alucinação).

    Retorna (n_total, n_validas).
    """
    base = _norm(texto_fonte)
    total = valid = 0
    for campo in S.CAMPOS:
        ce = getattr(d, campo)
        mantidos = []
        for it in ce.itens:
            total += 1
            if _norm(it.trecho_fonte) in base:
                valid += 1
                mantidos.append(it)
        ce.itens = mantidos
        if not mantidos:
            ce.declarado_ausente = True
    return total, valid
