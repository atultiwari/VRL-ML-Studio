"""Workflow sharing — generate and resolve public share links."""
from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from core.logging import get_logger
from core.settings import settings

logger = get_logger(__name__)
router = APIRouter(prefix="/share", tags=["share"])

SHARES_FILE = Path(settings.vrl_projects_dir) / "shares.json"
TOKEN_LENGTH = 12  # 12-byte hex = 24 chars, collision-safe


class ShareCreateBody(BaseModel):
    pipeline: dict[str, Any]
    name: str = "Untitled Workflow"
    description: str = ""


def _read_shares() -> dict[str, Any]:
    """Load the shares registry from disk."""
    if not SHARES_FILE.exists():
        return {}
    try:
        return json.loads(SHARES_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def _write_shares(shares: dict[str, Any]) -> None:
    """Persist the shares registry to disk."""
    SHARES_FILE.parent.mkdir(parents=True, exist_ok=True)
    SHARES_FILE.write_text(json.dumps(shares, indent=2))


@router.post("/create")
async def create_share(body: ShareCreateBody, request: Request) -> JSONResponse:
    """Snapshot the current pipeline and return a shareable token."""
    tenant_id: str = request.state.tenant_id

    token = secrets.token_hex(TOKEN_LENGTH)
    now = datetime.now(timezone.utc).isoformat()

    shares = _read_shares()
    shares[token] = {
        "pipeline": body.pipeline,
        "name": body.name,
        "description": body.description,
        "created_by_tenant": tenant_id,
        "created_at": now,
        "studio_version": settings.vrl_studio_version,
    }
    _write_shares(shares)

    logger.info("Share link created: token=%s, name=%s, tenant=%s", token, body.name, tenant_id)
    return JSONResponse({"token": token, "created_at": now})


@router.get("/{token}")
async def get_shared_workflow(token: str) -> JSONResponse:
    """Resolve a share token and return the pipeline snapshot.

    This endpoint is public — no tenant scoping. Anyone with the token can
    view the shared workflow.
    """
    shares = _read_shares()
    entry = shares.get(token)
    if not entry:
        raise HTTPException(404, "Shared workflow not found or link has expired")

    return JSONResponse({
        "pipeline": entry["pipeline"],
        "name": entry["name"],
        "description": entry.get("description", ""),
        "created_at": entry["created_at"],
        "studio_version": entry.get("studio_version", "1.0.0"),
    })


@router.delete("/{token}")
async def revoke_share(token: str, request: Request) -> JSONResponse:
    """Revoke a share link. Only the original creator can revoke."""
    tenant_id: str = request.state.tenant_id
    shares = _read_shares()
    entry = shares.get(token)
    if not entry:
        raise HTTPException(404, "Share link not found")
    if entry.get("created_by_tenant") != tenant_id:
        raise HTTPException(403, "You can only revoke your own share links")

    del shares[token]
    _write_shares(shares)

    logger.info("Share link revoked: token=%s, tenant=%s", token, tenant_id)
    return JSONResponse({"revoked": True})
