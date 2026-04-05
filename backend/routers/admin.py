"""Super-admin endpoints — cross-tenant project management.

Authentication is via env-configured credentials (ADMIN_USERNAME / ADMIN_PASSWORD).
A signed session cookie (`vrl_admin_session`) gates all /admin/* endpoints.
"""
from __future__ import annotations

import hashlib
import hmac
import io
import json
import secrets
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from core.logging import get_logger
from core.settings import settings
from core.tenant import tenant_display_name

logger = get_logger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])

BASE_PROJECTS_DIR = Path(settings.vrl_projects_dir)
TENANTS_DIR = BASE_PROJECTS_DIR / "tenants"

ADMIN_COOKIE = "vrl_admin_session"
ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8  # 8 hours

# ── Token generation & verification ──────────────────────────────────────────
# The session token is an HMAC of a random nonce, keyed by the admin password.
# This avoids storing server-side session state while preventing forgery.

_session_nonces: set[str] = set()


def _admin_enabled() -> bool:
    return bool(settings.admin_username and settings.admin_password)


def _generate_session_token() -> str:
    nonce = secrets.token_hex(16)
    _session_nonces.add(nonce)
    sig = hmac.new(
        settings.admin_password.encode(),
        nonce.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{nonce}:{sig}"


def _verify_session_token(token: str) -> bool:
    if not token or ":" not in token:
        return False
    nonce, sig = token.split(":", 1)
    if nonce not in _session_nonces:
        return False
    expected = hmac.new(
        settings.admin_password.encode(),
        nonce.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(sig, expected)


def _require_admin(request: Request) -> None:
    if not _admin_enabled():
        raise HTTPException(404, "Admin panel is not enabled")
    token = request.cookies.get(ADMIN_COOKIE)
    if not token or not _verify_session_token(token):
        raise HTTPException(401, "Admin session expired or invalid")


# ── Request schemas ──────────────────────────────────────────────────────────

class LoginBody(BaseModel):
    username: str
    password: str


class BulkProjectRef(BaseModel):
    tenant_id: str
    project_name: str


class BulkActionBody(BaseModel):
    projects: list[BulkProjectRef]


# ── Helpers ──────────────────────────────────────────────────────────────────

def _read_project_meta(project_path: Path) -> dict[str, Any]:
    meta_file = project_path / "project.yaml"
    if meta_file.exists():
        return yaml.safe_load(meta_file.read_text()) or {}
    return {"name": project_path.name}


def _read_pipeline(project_path: Path) -> dict[str, Any]:
    pipeline_file = project_path / "pipeline.json"
    if pipeline_file.exists():
        return json.loads(pipeline_file.read_text())
    return {"version": "1.0", "nodes": [], "edges": []}


def _resolve_project_path(tenant_id: str, project_name: str) -> Path:
    """Resolve and validate a tenant+project path. Raises 404 if missing."""
    path = (TENANTS_DIR / tenant_id / project_name).resolve()
    # Guard against path traversal
    if not str(path).startswith(str(TENANTS_DIR.resolve())):
        raise HTTPException(403, "Invalid path")
    if not path.exists() or not (path / "project.yaml").exists():
        raise HTTPException(404, f"Project not found: {tenant_id}/{project_name}")
    return path


def _build_vrlflow(pipeline: dict, name: str) -> dict:
    """Build a .vrlflow envelope around a pipeline."""
    node_types = list({n["type"] for n in pipeline.get("nodes", [])})
    return {
        "format": "vrl-ml-studio-workflow",
        "format_version": "1.0",
        "studio_version": settings.vrl_studio_version,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "name": name,
        "description": "",
        "node_types_used": node_types,
        "pipeline": pipeline,
    }


# ── Auth endpoints ───────────────────────────────────────────────────────────

@router.get("/enabled")
async def admin_enabled() -> dict:
    """Check whether the admin panel is configured."""
    return {"enabled": _admin_enabled()}


@router.post("/login")
async def login(body: LoginBody) -> Response:
    if not _admin_enabled():
        raise HTTPException(404, "Admin panel is not enabled")

    if not hmac.compare_digest(body.username, settings.admin_username):
        raise HTTPException(401, "Invalid credentials")
    if not hmac.compare_digest(body.password, settings.admin_password):
        raise HTTPException(401, "Invalid credentials")

    token = _generate_session_token()
    response = JSONResponse({"status": "ok"})
    response.set_cookie(
        key=ADMIN_COOKIE,
        value=token,
        max_age=ADMIN_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        path="/",
    )
    return response


@router.get("/session")
async def check_session(request: Request) -> dict:
    """Check if current admin session is valid."""
    if not _admin_enabled():
        return {"authenticated": False}
    token = request.cookies.get(ADMIN_COOKIE)
    return {"authenticated": bool(token and _verify_session_token(token))}


@router.post("/logout")
async def logout() -> Response:
    response = JSONResponse({"status": "ok"})
    response.delete_cookie(key=ADMIN_COOKIE, path="/")
    return response


# ── Workspace listing ────────────────────────────────────────────────────────

@router.get("/workspaces")
async def list_workspaces(request: Request) -> list[dict]:
    """List all tenant workspaces with project counts."""
    _require_admin(request)

    if not TENANTS_DIR.exists():
        return []

    workspaces = []
    for tenant_dir in sorted(TENANTS_DIR.iterdir()):
        if not tenant_dir.is_dir():
            continue
        tenant_id = tenant_dir.name
        projects = [
            d for d in tenant_dir.iterdir()
            if d.is_dir() and (d / "project.yaml").exists()
        ]
        workspaces.append({
            "tenant_id": tenant_id,
            "display_name": tenant_display_name(tenant_id),
            "project_count": len(projects),
        })

    return workspaces


# ── Project listing (all or per-tenant) ──────────────────────────────────────

@router.get("/projects")
async def list_all_projects(request: Request, tenant_id: str = "") -> list[dict]:
    """List projects across all tenants, or for a specific tenant."""
    _require_admin(request)

    if not TENANTS_DIR.exists():
        return []

    tenant_dirs = (
        [TENANTS_DIR / tenant_id]
        if tenant_id
        else sorted(TENANTS_DIR.iterdir())
    )

    projects: list[dict] = []
    for tenant_dir in tenant_dirs:
        if not tenant_dir.is_dir():
            continue
        tid = tenant_dir.name
        for d in sorted(tenant_dir.iterdir()):
            if not d.is_dir() or not (d / "project.yaml").exists():
                continue
            meta = _read_project_meta(d)
            pipeline = _read_pipeline(d)
            node_count = len(pipeline.get("nodes", []))

            projects.append({
                "tenant_id": tid,
                "display_name": tenant_display_name(tid),
                "project_name": d.name,
                "name": meta.get("name", d.name),
                "description": meta.get("description", ""),
                "tags": meta.get("tags", []),
                "node_count": node_count,
                "created_at": meta.get("created_at", ""),
                "last_modified": meta.get("last_modified", ""),
            })

    projects.sort(key=lambda p: p.get("last_modified", ""), reverse=True)
    return projects


# ── Download single project ──────────────────────────────────────────────────

@router.get("/projects/{tenant_id}/{project_name}/download")
async def download_project(
    tenant_id: str,
    project_name: str,
    request: Request,
) -> Response:
    """Download a project's pipeline as a .vrlflow file."""
    _require_admin(request)
    path = _resolve_project_path(tenant_id, project_name)
    meta = _read_project_meta(path)
    pipeline = _read_pipeline(path)

    envelope = _build_vrlflow(pipeline, meta.get("name", project_name))
    content = json.dumps(envelope, indent=2)
    filename = f"{project_name}.vrlflow"

    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Bulk download ────────────────────────────────────────────────────────────

@router.post("/projects/bulk-download")
async def bulk_download(body: BulkActionBody, request: Request) -> StreamingResponse:
    """Download multiple projects as a zip of .vrlflow files."""
    _require_admin(request)

    if not body.projects:
        raise HTTPException(400, "No projects specified")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for ref in body.projects:
            path = _resolve_project_path(ref.tenant_id, ref.project_name)
            meta = _read_project_meta(path)
            pipeline = _read_pipeline(path)
            envelope = _build_vrlflow(pipeline, meta.get("name", ref.project_name))
            display = tenant_display_name(ref.tenant_id)
            filename = f"{display}/{ref.project_name}.vrlflow"
            zf.writestr(filename, json.dumps(envelope, indent=2))

    buf.seek(0)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="vrl-projects-{timestamp}.zip"',
        },
    )


# ── Delete single project ───────────────────────────────────────────────────

@router.delete("/projects/{tenant_id}/{project_name}")
async def delete_project(
    tenant_id: str,
    project_name: str,
    request: Request,
) -> dict:
    """Permanently delete a project and all its data."""
    _require_admin(request)
    path = _resolve_project_path(tenant_id, project_name)
    shutil.rmtree(path)
    logger.info("Admin deleted project %s/%s", tenant_id, project_name)
    return {"deleted": f"{tenant_id}/{project_name}"}


# ── Bulk delete ──────────────────────────────────────────────────────────────

@router.post("/projects/bulk-delete")
async def bulk_delete(body: BulkActionBody, request: Request) -> dict:
    """Permanently delete multiple projects."""
    _require_admin(request)

    if not body.projects:
        raise HTTPException(400, "No projects specified")

    deleted = []
    errors = []
    for ref in body.projects:
        try:
            path = _resolve_project_path(ref.tenant_id, ref.project_name)
            shutil.rmtree(path)
            deleted.append(f"{ref.tenant_id}/{ref.project_name}")
            logger.info("Admin deleted project %s/%s", ref.tenant_id, ref.project_name)
        except Exception as exc:
            errors.append({"project": f"{ref.tenant_id}/{ref.project_name}", "error": str(exc)})

    return {"deleted": deleted, "errors": errors}
