from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from core.logging import get_logger
from core.settings import settings
from core.tenant import COOKIE_NAME, TenantMiddleware, tenant_display_name
from routers import admin, execute, export, nodes, project, share, upload
from services.cache import CacheService
from services.dag_executor import DAGExecutor
from services.node_registry import NodeRegistry

logger = get_logger(__name__)

# ── Application-wide singletons ───────────────────────────────────────────────
# These are created once at startup and shared across all requests.
registry = NodeRegistry()
cache = CacheService()
executor = DAGExecutor(registry=registry, cache=cache)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("VRL ML Studio backend starting up (v%s)", settings.vrl_studio_version)
    registry.load_builtin_packages()
    app.state.registry = registry
    app.state.cache = cache
    logger.info("Node registry ready — %d nodes loaded", len(registry))
    yield
    # Shutdown
    cache.clear()
    logger.info("VRL ML Studio backend shut down")


app = FastAPI(
    title="VRL ML Studio API",
    version=settings.vrl_studio_version,
    description=(
        "Backend API for VRL ML Studio — a visual machine learning "
        "workflow platform for tabular data."
    ),
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────────────
# Tenant middleware must be added BEFORE CORS so it can set cookies on responses.
app.add_middleware(TenantMiddleware)

# CORS — origins are configurable via CORS_ORIGINS env var (comma-separated).
_default_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
_extra = settings.cors_origins.split(",") if settings.cors_origins else []
_origins = _default_origins + [o.strip() for o in _extra if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(execute.router)
app.include_router(nodes.router)
app.include_router(project.router)
app.include_router(export.router)
app.include_router(upload.router)
app.include_router(share.router)
app.include_router(admin.router)


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health() -> dict:
    return {
        "status": "ok",
        "version": settings.vrl_studio_version,
        "nodes_loaded": len(registry),
    }


# ── Tenant info ──────────────────────────────────────────────────────────────
@app.get("/tenant/info", tags=["tenant"])
async def tenant_info(request: Request) -> dict:
    """Return the current tenant ID and human-friendly workspace name."""
    tenant_id: str = request.state.tenant_id
    return {
        "tenant_id": tenant_id,
        "workspace_name": tenant_display_name(tenant_id),
    }
