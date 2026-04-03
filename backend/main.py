from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.logging import get_logger
from core.settings import settings
from routers import execute, export, nodes, project, upload
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

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health() -> dict:
    return {
        "status": "ok",
        "version": settings.vrl_studio_version,
        "nodes_loaded": len(registry),
    }
