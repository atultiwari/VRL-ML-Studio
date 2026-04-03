"""File upload endpoint — stores uploaded data files to a temp directory in Stage 4."""
from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, File, UploadFile
from fastapi.responses import JSONResponse

from core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/upload", tags=["upload"])

# Stage 4: use a persistent temp dir for uploaded files
_UPLOAD_DIR = Path(tempfile.gettempdir()) / "vrl-uploads"
_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".csv", ".tsv", ".xlsx", ".xls"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB


@router.post("")
async def upload_file(file: UploadFile = File(...)) -> JSONResponse:
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

    safe_name = Path(file.filename or "upload").name
    dest = _UPLOAD_DIR / safe_name
    # Avoid name collision
    counter = 0
    while dest.exists():
        counter += 1
        dest = _UPLOAD_DIR / f"{Path(safe_name).stem}_{counter}{suffix}"

    dest.write_bytes(content)
    logger.info("Uploaded file '%s' → '%s' (%d bytes)", file.filename, dest, len(content))

    return JSONResponse({
        "path": str(dest),
        "name": safe_name,
        "size": len(content),
    })
