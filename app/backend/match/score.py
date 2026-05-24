"""Pontuação do match ("bingo") de um segmento crítico.

Função PURA (sem I/O): combina sinais já normalizados/booleanos numa nota 0–10.
"""
from __future__ import annotations


def score(
    densidade_norm: float,
    tem_fator: bool,
    tem_dinamica: bool,
    lacuna_camera: bool,
) -> float:
    """Nota 0–10 de um segmento crítico.

    Fórmula (documentada e testada):
        min(10.0, 5*densidade_norm + 2*tem_fator + 1.5*tem_dinamica + 1.5*lacuna_camera)

    - densidade_norm: densidade de ocorrências da célula / densidade máxima (0..1).
    - tem_fator: há fator urbano (causa removível) no raio.
    - tem_dinamica: há dinâmica criminal estruturada (RELINT/Disque) para a área.
    - lacuna_camera: não há câmera no raio (cobertura ausente).
    """
    nota = (
        5.0 * float(densidade_norm)
        + 2.0 * (1.0 if tem_fator else 0.0)
        + 1.5 * (1.0 if tem_dinamica else 0.0)
        + 1.5 * (1.0 if lacuna_camera else 0.0)
    )
    return min(10.0, nota)
