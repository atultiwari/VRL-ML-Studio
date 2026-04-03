from __future__ import annotations

from fastapi import APIRouter

from core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/nodes", tags=["nodes"])


@router.get("")
async def list_nodes() -> dict:
    """List all registered node manifests. Full implementation in Stage 11."""
    return {"nodes": [], "message": "Node registry endpoint ready"}
