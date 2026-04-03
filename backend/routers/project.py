from __future__ import annotations

from fastapi import APIRouter

from core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/project", tags=["project"])


@router.get("/health-sub")
async def project_health() -> dict:
    """Placeholder — full implementation in Stage 9."""
    return {"status": "ok"}
