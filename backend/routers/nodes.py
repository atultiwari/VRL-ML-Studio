from __future__ import annotations

from fastapi import APIRouter, Request
from pydantic import BaseModel

from core.logging import get_logger
from models.node import PortSpec

logger = get_logger(__name__)
router = APIRouter(prefix="/nodes", tags=["nodes"])


class NodeEntry(BaseModel):
    id: str
    name: str
    version: str
    category: str
    description: str
    inputs: list[PortSpec]
    outputs: list[PortSpec]
    icon: str
    color: str
    badge_text: str
    is_builtin: bool


@router.get("", response_model=list[NodeEntry])
async def list_nodes(request: Request) -> list[NodeEntry]:
    """Return all registered node manifests merged with their UI spec."""
    registry = request.app.state.registry
    result: list[NodeEntry] = []
    for pkg in registry.get_all_packages():
        m = pkg.manifest
        u = pkg.ui
        result.append(
            NodeEntry(
                id=m.id,
                name=m.name,
                version=m.version,
                category=m.category,
                description=m.description,
                inputs=m.inputs,
                outputs=m.outputs,
                icon=u.icon,
                color=u.color,
                badge_text=u.badge_text,
                is_builtin=pkg.is_builtin,
            )
        )
    return result
