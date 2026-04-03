"""Node registry router — list, import, and export node packages."""

from __future__ import annotations

import io
import json
import shutil
import zipfile
from pathlib import Path

from fastapi import APIRouter, File, Query, Request, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from core.logging import get_logger
from core.settings import settings
from models.node import NodeManifest, ParameterSpec, PortSpec

logger = get_logger(__name__)
router = APIRouter(prefix="/nodes", tags=["nodes"])

REQUIRED_FILES = {"manifest.json", "executor.py", "parameters.json", "ui.json"}


class NodeEntry(BaseModel):
    id: str
    name: str
    version: str
    category: str
    description: str
    inputs: list[PortSpec]
    outputs: list[PortSpec]
    parameters: list[ParameterSpec]
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
                parameters=pkg.parameters,
                icon=u.icon,
                color=u.color,
                badge_text=u.badge_text,
                is_builtin=pkg.is_builtin,
            )
        )
    return result


# ── Import .vrlnode ──────────────────────────────────────────────────────────


@router.post("/import")
async def import_node_package(
    request: Request,
    file: UploadFile = File(...),
    project_path: str = Query(""),
) -> JSONResponse:
    """Import a .vrlnode zip archive into the project's custom node_packages.

    Validates the zip structure, checks for path traversal, unpacks, validates
    the manifest, and registers the node in the running registry.
    """
    registry = request.app.state.registry

    # ── Read and validate the zip ──
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50 MB limit
        return JSONResponse(status_code=413, content={"detail": "Node package exceeds 50 MB limit"})

    try:
        zf = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile:
        return JSONResponse(status_code=400, content={"detail": "Invalid zip file"})

    # ── Security: reject path traversal ──
    for name in zf.namelist():
        if ".." in name or name.startswith("/"):
            return JSONResponse(
                status_code=400,
                content={"detail": f"Path traversal detected in zip entry: '{name}'"},
            )

    # ── Find the package root directory ──
    top_dirs = {name.split("/")[0] for name in zf.namelist() if "/" in name}
    top_files = {name for name in zf.namelist() if "/" not in name and name}

    if len(top_dirs) == 1 and not top_files:
        pkg_prefix = list(top_dirs)[0] + "/"
        pkg_name = list(top_dirs)[0]
    elif top_files:
        pkg_prefix = ""
        pkg_name = Path(file.filename or "custom_node").stem
    else:
        return JSONResponse(
            status_code=400,
            content={"detail": "Zip must contain a single package directory at root"},
        )

    # ── Validate required files exist ──
    zip_entries = set(zf.namelist())
    for required in REQUIRED_FILES:
        expected = pkg_prefix + required
        if expected not in zip_entries:
            return JSONResponse(
                status_code=400,
                content={"detail": f"Missing required file: {required}"},
            )

    # ── Validate manifest.json ──
    try:
        manifest_data = json.loads(zf.read(pkg_prefix + "manifest.json"))
        manifest = NodeManifest(**manifest_data)
    except Exception as exc:
        return JSONResponse(
            status_code=400,
            content={"detail": f"Invalid manifest.json: {exc}"},
        )

    # ── Check studio version compatibility ──
    from packaging.version import Version

    try:
        if Version(settings.vrl_studio_version) < Version(manifest.min_studio_version):
            return JSONResponse(
                status_code=400,
                content={
                    "detail": f"Node requires studio >= {manifest.min_studio_version}, "
                    f"but running {settings.vrl_studio_version}"
                },
            )
    except Exception:
        pass

    # ── Determine target directory ──
    if project_path:
        target_base = Path(project_path) / "node_packages"
    else:
        target_base = Path(settings.vrl_projects_dir) / "_shared_packages"

    target_base.mkdir(parents=True, exist_ok=True)
    target_dir = target_base / pkg_name

    if target_dir.exists():
        shutil.rmtree(target_dir)

    target_dir.mkdir(parents=True, exist_ok=True)

    # ── Extract files ──
    for zip_entry in zf.namelist():
        if zip_entry.endswith("/"):
            continue
        relative = zip_entry[len(pkg_prefix):] if pkg_prefix else zip_entry
        if not relative:
            continue
        dest = target_dir / relative
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(zf.read(zip_entry))

    # ── Register in the running registry ──
    try:
        package = registry._load_package(target_dir, is_builtin=False)
        registry.register(package)
    except Exception as exc:
        shutil.rmtree(target_dir, ignore_errors=True)
        return JSONResponse(
            status_code=400,
            content={"detail": f"Failed to register node: {exc}"},
        )

    logger.info("Imported node package '%s' to '%s'", manifest.id, target_dir)

    return JSONResponse(
        status_code=201,
        content={
            "id": manifest.id,
            "name": manifest.name,
            "version": manifest.version,
            "category": manifest.category,
            "package_dir": str(target_dir),
        },
    )


# ── Export .vrlnode ──────────────────────────────────────────────────────────


@router.get("/export/{node_id:path}")
async def export_node_package(node_id: str, request: Request) -> StreamingResponse:
    """Export a node package as a .vrlnode zip archive."""
    registry = request.app.state.registry

    pkg_dir = registry.get_package_dir(node_id)
    if pkg_dir is None or not pkg_dir.exists():
        return JSONResponse(  # type: ignore[return-value]
            status_code=404,
            content={"detail": f"Node '{node_id}' not found"},
        )

    buf = io.BytesIO()
    dir_name = pkg_dir.name

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in sorted(pkg_dir.rglob("*")):
            if file_path.is_file():
                if "__pycache__" in str(file_path) or file_path.suffix == ".pyc":
                    continue
                arc_name = f"{dir_name}/{file_path.relative_to(pkg_dir)}"
                zf.write(file_path, arc_name)

    buf.seek(0)
    safe_name = node_id.replace(".", "_") + ".vrlnode"

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )


# ── Installed nodes grouped ─────────────────────────────────────────────────


@router.get("/installed")
async def installed_nodes(request: Request) -> JSONResponse:
    """List all installed nodes grouped by builtin/custom."""
    registry = request.app.state.registry
    builtin = []
    custom = []

    for pkg in registry.get_all_packages():
        entry = {
            "id": pkg.manifest.id,
            "name": pkg.manifest.name,
            "version": pkg.manifest.version,
            "category": pkg.manifest.category,
        }
        if pkg.is_builtin:
            builtin.append(entry)
        else:
            custom.append(entry)

    return JSONResponse(content={"builtin": builtin, "custom": custom})
