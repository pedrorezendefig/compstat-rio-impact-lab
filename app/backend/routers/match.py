"""Router auxiliar do match — preenchido pela Trilha 1 (Dados & Match), se necessário.

O endpoint principal do match é GET /report/{id}/coincidencias (em report.py).
Este módulo pode expor utilidades extras do motor de match.
"""
from fastapi import APIRouter

router = APIRouter()
