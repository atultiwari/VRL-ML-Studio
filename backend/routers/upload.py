"""File upload endpoint — stores uploaded data files scoped per tenant."""
from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Request, UploadFile
from fastapi.responses import JSONResponse

from core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/upload", tags=["upload"])

_UPLOAD_BASE = Path(tempfile.gettempdir()) / "vrl-uploads"

ALLOWED_EXTENSIONS = {".csv", ".tsv", ".xlsx", ".xls"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB


def _tenant_upload_dir(request: Request) -> Path:
    """Return a per-tenant upload directory."""
    tenant_id: str = request.state.tenant_id
    d = _UPLOAD_BASE / tenant_id
    d.mkdir(parents=True, exist_ok=True)
    return d


@router.post("")
async def upload_file(request: Request, file: UploadFile = File(...)) -> JSONResponse:
    """Upload a data file and return its server-side path."""
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        return JSONResponse(
            status_code=400,
            content={"detail": f"Unsupported file type '{suffix}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}"},
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        return JSONResponse(
            status_code=413,
            content={"detail": "File exceeds 100 MB limit"},
        )

    upload_dir = _tenant_upload_dir(request)
    safe_name = Path(file.filename or "upload").name
    dest = upload_dir / safe_name
    # Avoid name collision
    counter = 0
    while dest.exists():
        counter += 1
        dest = upload_dir / f"{Path(safe_name).stem}_{counter}{suffix}"

    dest.write_bytes(content)
    logger.info("Uploaded file '%s' → '%s' (%d bytes)", file.filename, dest, len(content))

    return JSONResponse({
        "path": str(dest),
        "name": safe_name,
        "size": len(content),
    })
