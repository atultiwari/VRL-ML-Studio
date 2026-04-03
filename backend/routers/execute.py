from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from core.logging import get_logger
from models.pipeline import ExecuteRequest, NodeStatus
from services.cache import CacheService
from services.dag_executor import DAGExecutionError, DAGExecutor
from services.node_registry import NodeRegistry

logger = get_logger(__name__)
router = APIRouter()


def _get_executor(registry: NodeRegistry, cache: CacheService) -> DAGExecutor:
    return DAGExecutor(registry=registry, cache=cache)


@router.post("/execute")
async def execute_pipeline(request: ExecuteRequest) -> JSONResponse:
    """Synchronous pipeline execution endpoint (for simple single-node runs).

    For multi-node pipelines with real-time status, use the WebSocket endpoint.
    Full implementation with registry/cache injection in Stage 4.
    """
    return JSONResponse({"status": "ok", "message": "Execution endpoint ready"})


@router.websocket("/ws")
async def websocket_execute(websocket: WebSocket) -> None:
    """WebSocket endpoint for real-time pipeline execution with node status streaming.

    Client sends: { "pipeline": {...}, "project_path": "..." }
    Server sends: { "node_id": "...", "status": "running"|"success"|"error", "error"?: "..." }
    """
    await websocket.accept()
    logger.info("WebSocket client connected")

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            await websocket.send_json(
                {"type": "info", "message": "WebSocket execution endpoint ready"}
            )

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as exc:
        logger.error("WebSocket error: %s", exc)
        await websocket.send_json({"type": "error", "message": str(exc)})
