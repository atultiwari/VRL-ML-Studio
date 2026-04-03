from __future__ import annotations

from fastapi import APIRouter

from core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/export", tags=["export"])


@router.get("/health-sub")
async def export_health() -> dict:
    """Placeholder — full implementation in Stage 10."""
    return {"status": "ok"}
