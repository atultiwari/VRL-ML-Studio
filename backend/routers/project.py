"""Project management endpoints — CRUD, git save/history/checkout/branch."""
from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from core.logging import get_logger
from core.settings import settings
from services.git_service import GitService


class DatasetPreviewRequest(BaseModel):
    dataset: str = "iris"
    file_path: str = ""


class SaveProjectBody(BaseModel):
    project_path: str
    pipeline: dict
    message: str = ""


class CheckoutBody(BaseModel):
    project_path: str
    commit_hash: str


class BranchBody(BaseModel):
    project_path: str
    branch_name: str

logger = get_logger(__name__)
router = APIRouter(tags=["project"])

BASE_PROJECTS_DIR = Path(settings.vrl_projects_dir)
TEMPLATES_DIR = Path(__file__).parent.parent / "templates"


def _tenant_projects_dir(request: Request) -> Path:
    """Return the projects directory scoped to the current tenant."""
    tenant_id: str = request.state.tenant_id
    tenant_dir = BASE_PROJECTS_DIR / "tenants" / tenant_id
    tenant_dir.mkdir(parents=True, exist_ok=True)
    return tenant_dir

GITIGNORE_CONTENT = """\
outputs/
__pycache__/
*.pyc
.DS_Store
.env
"""


def _ensure_projects_dir(request: Request) -> Path:
    """Return the tenant-scoped projects directory, creating it if needed."""
    return _tenant_projects_dir(request)


def _validate_tenant_path(request: Request, project_path: str) -> Path:
    """Ensure the given project_path belongs to the current tenant.

    Raises HTTPException 403 if the path is outside the tenant's directory.
    """
    tenant_dir = _tenant_projects_dir(request)
    resolved = Path(project_path).resolve()
    if not str(resolved).startswith(str(tenant_dir.resolve())):
        raise HTTPException(403, "Access denied: project belongs to a different workspace")
    return resolved


def _read_project_meta(project_path: Path) -> dict[str, Any]:
    meta_file = project_path / "project.yaml"
    if meta_file.exists():
        return yaml.safe_load(meta_file.read_text()) or {}
    return {"name": project_path.name}


def _write_project_meta(project_path: Path, meta: dict[str, Any]) -> None:
    meta_file = project_path / "project.yaml"
    meta_file.write_text(yaml.dump(meta, default_flow_style=False, sort_keys=False))


def _read_pipeline(project_path: Path) -> dict[str, Any]:
    pipeline_file = project_path / "pipeline.json"
    if pipeline_file.exists():
        return json.loads(pipeline_file.read_text())
    return {"version": "1.0", "nodes": [], "edges": []}


def _write_pipeline(project_path: Path, pipeline: dict[str, Any]) -> None:
    pipeline_file = project_path / "pipeline.json"
    pipeline_file.write_text(json.dumps(pipeline, indent=2))


# ── POST /dataset/preview — quick column info for Smart Wizard ───────────────

@router.post("/dataset/preview")
async def dataset_preview(body: DatasetPreviewRequest) -> JSONResponse:
    """Load a sample dataset or uploaded CSV and return column metadata + preview rows."""
    import pandas as pd

    if body.file_path:
        # Preview an uploaded CSV file
        fp = Path(body.file_path)
        if not fp.exists():
            raise HTTPException(404, f"File not found: {body.file_path}")
        try:
            df = pd.read_csv(fp)
        except Exception as exc:
            raise HTTPException(400, f"Failed to read CSV: {exc}") from exc
    else:
        from node_packages.builtin.sample_dataset.executor import execute as load_dataset
        try:
            result = load_dataset({}, {"dataset": body.dataset}, {})
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        df = result["dataframe_out"]
    import numpy as np

    n_rows = len(df)
    columns = []
    for col in df.columns:
        series = df[col]
        is_numeric = series.dtype.kind in ("i", "f")
        missing = int(series.isnull().sum())
        unique = int(series.nunique())
        col_info: dict[str, Any] = {
            "name": col,
            "dtype": str(series.dtype),
            "missing": missing,
            "unique": unique,
            "is_numeric": is_numeric,
            "missing_pct": round(missing / n_rows * 100, 1) if n_rows > 0 else 0.0,
            "cardinality_ratio": round(unique / n_rows, 3) if n_rows > 0 else 0.0,
        }
        if is_numeric:
            clean = series.dropna()
            if len(clean) > 0:
                q1 = float(clean.quantile(0.25))
                q3 = float(clean.quantile(0.75))
                iqr = q3 - q1
                outlier_mask = (clean < q1 - 1.5 * iqr) | (clean > q3 + 1.5 * iqr)
                col_info["skewness"] = round(float(clean.skew()), 2)
                col_info["outlier_count"] = int(outlier_mask.sum())
                col_info["mean"] = round(float(clean.mean()), 4)
                col_info["std"] = round(float(clean.std()), 4)
                col_info["min"] = float(clean.min())
                col_info["max"] = float(clean.max())
            else:
                col_info["skewness"] = 0.0
                col_info["outlier_count"] = 0
                col_info["mean"] = 0.0
                col_info["std"] = 0.0
                col_info["min"] = 0.0
                col_info["max"] = 0.0
        else:
            col_info["skewness"] = None
            col_info["outlier_count"] = 0
            # Top frequency ratio for categorical dominance detection
            top_freq = int(series.value_counts().iloc[0]) if unique > 0 else 0
            col_info["top_freq_ratio"] = round(top_freq / n_rows, 3) if n_rows > 0 else 0.0
        columns.append(col_info)

    # Duplicate row count
    duplicate_rows = int(df.duplicated().sum())

    # Send first 5 rows for preview
    preview = df.head(5).fillna("").values.tolist()

    return JSONResponse({
        "columns": columns,
        "column_names": list(df.columns),
        "shape": list(df.shape),
        "preview": preview,
        "duplicate_rows": duplicate_rows,
    })


# ── GET /projects — list all projects ────────────────────────────────────────

@router.get("/projects")
async def list_projects(request: Request) -> list[dict[str, Any]]:
    base = _ensure_projects_dir(request)
    projects = []
    for d in sorted(base.iterdir()):
        if not d.is_dir() or not (d / "project.yaml").exists():
            continue
        meta = _read_project_meta(d)
        # Get last modified from git or filesystem
        try:
            git = GitService(d)
            history = git.get_history(max_count=1)
            last_modified = history[0]["timestamp"] if history else datetime.now(timezone.utc).isoformat()
        except Exception:
            stat = d.stat()
            last_modified = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()

        projects.append({
            "name": meta.get("name", d.name),
            "path": str(d),
            "description": meta.get("description", ""),
            "last_modified": last_modified,
            "tags": meta.get("tags", []),
        })

    # Sort newest first
    projects.sort(key=lambda p: p["last_modified"], reverse=True)
    return projects


# ── POST /project/create — create a new project ─────────────────────────────

@router.post("/project/create")
async def create_project(
    request: Request,
    name: str,
    description: str = "",
    tags: str = "",  # comma-separated
    template: str = "blank",
) -> JSONResponse:
    base = _ensure_projects_dir(request)
    # Sanitise project directory name
    safe_name = "".join(c if c.isalnum() or c in "-_ " else "" for c in name).strip()
    safe_name = safe_name.replace(" ", "-").lower()
    if not safe_name:
        raise HTTPException(400, "Invalid project name")

    project_path = base / safe_name
    if project_path.exists():
        raise HTTPException(409, f"Project '{safe_name}' already exists")

    # Create directory structure
    project_path.mkdir(parents=True)
    (project_path / "data").mkdir()
    (project_path / "outputs").mkdir()
    (project_path / "exports").mkdir()
    (project_path / "node_packages").mkdir()

    # Write .gitignore
    (project_path / ".gitignore").write_text(GITIGNORE_CONTENT)

    # Write project metadata
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    now = datetime.now(timezone.utc)
    meta = {
        "name": name,
        "description": description,
        "created_at": now.isoformat(),
        "last_modified": now.isoformat(),
        "vrl_studio_version": settings.vrl_studio_version,
        "tags": tag_list,
    }
    _write_project_meta(project_path, meta)

    # Load template pipeline
    template_name = template or "blank"
    template_file = TEMPLATES_DIR / f"{template_name}.json"
    if template_file.exists():
        pipeline = json.loads(template_file.read_text())
    else:
        pipeline = {"version": "1.0", "nodes": [], "edges": []}

    _write_pipeline(project_path, pipeline)

    # Init git repo and initial commit
    git = GitService(project_path)
    git.init_repo()
    commit_hash = git.commit_all(f"Initial commit: {name}")

    logger.info("Created project '%s' at %s", name, project_path)
    return JSONResponse({
        "project_path": str(project_path),
        "name": name,
        "commit_hash": commit_hash,
        "pipeline": pipeline,
    })


# ── POST /project/save — save pipeline and commit ───────────────────────────

@router.post("/project/save")
async def save_project(body: SaveProjectBody, request: Request) -> JSONResponse:
    project_path = body.project_path
    pipeline = body.pipeline
    message = body.message
    path = _validate_tenant_path(request, project_path)
    if not path.exists() or not (path / "project.yaml").exists():
        raise HTTPException(404, f"Project not found: {project_path}")

    # Write pipeline JSON
    _write_pipeline(path, pipeline)

    # Update last_modified in project.yaml
    meta = _read_project_meta(path)
    meta["last_modified"] = datetime.now(timezone.utc).isoformat()
    _write_project_meta(path, meta)

    # Git commit
    commit_message = f"save: {message}" if message else f"save: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}"
    git = GitService(path)
    commit_hash = git.commit_all(commit_message)

    return JSONResponse({
        "commit_hash": commit_hash,
        "message": commit_message,
    })


# ── GET /project/history — git commit history ───────────────────────────────

@router.get("/project/history")
async def project_history(project_path: str, request: Request) -> list[dict[str, Any]]:
    path = _validate_tenant_path(request, project_path)
    if not path.exists():
        raise HTTPException(404, f"Project not found: {project_path}")

    git = GitService(path)
    return git.get_history(max_count=50)


# ── POST /project/checkout — restore a previous version ─────────────────────

@router.post("/project/checkout")
async def checkout_version(
    request: Request,
    project_path: str,
    commit_hash: str,
) -> JSONResponse:
    path = _validate_tenant_path(request, project_path)
    if not path.exists():
        raise HTTPException(404, f"Project not found: {project_path}")

    git = GitService(path)

    # Auto-save current changes before switching
    try:
        git.commit_all("auto-save before checkout")
    except Exception:
        pass

    # Create a new branch from the target commit instead of detached HEAD
    git.repo.git.checkout(commit_hash)
    pipeline = _read_pipeline(path)

    # Return to main branch with restored pipeline
    try:
        git.checkout_branch("main")
        _write_pipeline(path, pipeline)
        git.commit_all(f"restore: {commit_hash[:8]}")
    except Exception:
        pass

    return JSONResponse({
        "pipeline": pipeline,
        "commit_hash": commit_hash,
    })


# ── POST /project/branch — create a new branch ─────────────────────────────

@router.post("/project/branch")
async def create_branch(
    request: Request,
    project_path: str,
    branch_name: str,
) -> JSONResponse:
    path = _validate_tenant_path(request, project_path)
    if not path.exists():
        raise HTTPException(404, f"Project not found: {project_path}")

    git = GitService(path)
    git.create_branch(branch_name)

    return JSONResponse({
        "branch": branch_name,
    })


# ── GET /project/info — current project details ─────────────────────────────

@router.get("/project/info")
async def project_info(project_path: str, request: Request) -> JSONResponse:
    path = _validate_tenant_path(request, project_path)
    if not path.exists():
        raise HTTPException(404, f"Project not found: {project_path}")

    meta = _read_project_meta(path)
    pipeline = _read_pipeline(path)

    git = GitService(path)
    branch = git.get_current_branch()
    branches = git.list_branches()

    return JSONResponse({
        "name": meta.get("name", path.name),
        "description": meta.get("description", ""),
        "tags": meta.get("tags", []),
        "branch": branch,
        "branches": branches,
        "pipeline": pipeline,
        "path": str(path),
    })


# ── GET /project/templates — list available templates ────────────────────────

@router.get("/project/templates")
async def list_templates() -> list[dict[str, Any]]:
    templates = []
    if TEMPLATES_DIR.exists():
        for f in sorted(TEMPLATES_DIR.glob("*.json")):
            data = json.loads(f.read_text())
            node_count = len(data.get("nodes", []))
            templates.append({
                "id": f.stem,
                "name": f.stem.replace("_", " ").title(),
                "node_count": node_count,
            })
    return templates
