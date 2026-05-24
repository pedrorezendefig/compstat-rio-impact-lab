"""Schema Pydantic da extração: a unidade atômica é a 'afirmação com proveniência'.

Os guardrails de IA responsável viram CAMPOS e VALIDATORS (não instruções soltas):
- toda afirmação carrega uma citação literal (`trecho_fonte`) e uma `confianca`;
- campo vazio só é válido como `declarado_ausente=True` (nunca inventar);
- `valor` é despersonalizado (LGPD — sem nome/idade/cor).
"""
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, model_validator

# Campos extraídos (alinhados ao briefing §7.1 + deslocamento do autor p/ modelo de emprego da FM)
CAMPOS = [
    "modalidade_criminal",
    "modus_operandi",
    "rotas_fuga",
    "pontos_receptacao",
    "controle_territorial",
    "deslocamento_autor",
]


class Confianca(str, Enum):
    alta = "alta"
    media = "media"
    baixa = "baixa"


class Afirmacao(BaseModel):
    valor: str = Field(description="Leitura normalizada e DESPERSONALIZADA do que o texto diz (sem nomes, idade, cor).")
    trecho_fonte: str = Field(min_length=8, description="Citação LITERAL copiada do texto-fonte que sustenta a afirmação.")
    confianca: Confianca = Field(description="alta=explícito; media=inferência razoável; baixa=indício fraco.")


class CampoExtraido(BaseModel):
    itens: List[Afirmacao] = Field(default_factory=list)
    declarado_ausente: bool = Field(default=False, description="True quando o texto NÃO traz este campo. Nunca preencher por suposição.")

    @model_validator(mode="after")
    def _coerencia(self):
        if not self.itens and not self.declarado_ausente:
            raise ValueError("campo vazio deve ter declarado_ausente=True")
        if self.itens and self.declarado_ausente:
            raise ValueError("não pode ter itens e declarado_ausente=True ao mesmo tempo")
        return self


class DinamicaExtraida(BaseModel):
    """Saída por unidade (sub-local de RELINT ou lote de relatos do Disque de uma área)."""
    sub_local: Optional[str] = Field(default=None, description="Nome do sub-local quando houver; senão null.")
    modalidade_criminal: CampoExtraido
    modus_operandi: CampoExtraido
    rotas_fuga: CampoExtraido
    pontos_receptacao: CampoExtraido
    controle_territorial: CampoExtraido
    deslocamento_autor: CampoExtraido
    incerteza_global: Confianca = Field(description="Leitura geral da qualidade/riqueza do texto-fonte.")
    despersonalizado: bool = Field(default=True, description="Confirma que nenhum 'valor' contém dado pessoal.")


def explode(d: DinamicaExtraida, area_fm_id, doc_id: str, fonte_tipo: str) -> List[dict]:
    """Achata a extração em linhas 'long' para o CSV (uma linha por afirmação ou ausência)."""
    rows = []
    for campo in CAMPOS:
        ce: CampoExtraido = getattr(d, campo)
        if ce.declarado_ausente:
            rows.append({
                "area_fm_id": area_fm_id, "sub_local": d.sub_local, "doc_id": doc_id,
                "fonte_tipo": fonte_tipo, "campo": campo, "valor": None,
                "trecho_fonte": None, "confianca": None, "declarado_ausente": True,
            })
        else:
            for it in ce.itens:
                rows.append({
                    "area_fm_id": area_fm_id, "sub_local": d.sub_local, "doc_id": doc_id,
                    "fonte_tipo": fonte_tipo, "campo": campo, "valor": it.valor,
                    "trecho_fonte": it.trecho_fonte, "confianca": it.confianca.value,
                    "declarado_ausente": False,
                })
    return rows
