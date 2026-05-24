"""Router de exportação — gera o relatório em .docx.

  GET /report/{id}/export.docx -> .docx com marca "RASCUNHO — validação humana"
"""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import Response

from ..export.docx_export import gerar_docx
from ..report.assembler import get_relatorio

router = APIRouter()

_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


@router.get("/report/{area_id}/export.docx")
def export_docx(area_id: int):
    rel = get_relatorio(area_id)
    data = gerar_docx(rel)
    return Response(
        content=data,
        media_type=_DOCX_MIME,
        headers={"Content-Disposition": f'attachment; filename="relatorio_area_{area_id}.docx"'},
    )
