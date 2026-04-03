"""Export router — generates Python scripts and Jupyter notebooks from pipelines."""

from __future__ import annotations

import json

from fastapi import APIRouter, Request
from fastapi.responses import Response
from pydantic import BaseModel

from core.logging import get_logger
from models.pipeline import PipelineJSON

logger = get_logger(__name__)
router = APIRouter(prefix="/export", tags=["export"])


class ExportRequest(BaseModel):
    pipeline: PipelineJSON
    pipeline_name: str = "Untitled Pipeline"


@router.post("/python")
async def export_python(body: ExportRequest, request: Request) -> Response:
    """Export a pipeline as a standalone .py script."""
    from services.export_service import ExportService

    registry = request.app.state.registry
    service = ExportService(registry=registry)

    code = service.export_python(
        pipeline=body.pipeline,
        pipeline_name=body.pipeline_name,
    )

    filename = body.pipeline_name.replace(" ", "_").lower() + ".py"

    return Response(
        content=code,
        media_type="text/x-python",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/notebook")
async def export_notebook(body: ExportRequest, request: Request) -> Response:
    """Export a pipeline as a Jupyter notebook (.ipynb)."""
    from services.export_service import ExportService

    registry = request.app.state.registry
    service = ExportService(registry=registry)

    notebook = service.export_notebook(
        pipeline=body.pipeline,
        pipeline_name=body.pipeline_name,
    )

    content = json.dumps(notebook, indent=2, ensure_ascii=False)
    filename = body.pipeline_name.replace(" ", "_").lower() + ".ipynb"

    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/health-sub")
async def export_health() -> dict:
    return {"status": "ok"}
