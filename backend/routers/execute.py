"""Pipeline execution: POST /execute (sync) and WebSocket /ws (streaming)."""
from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from core.logging import get_logger
from models.pipeline import ExecuteRequest, PipelineJSON
from services.dag_executor import DAGExecutionError, DAGExecutor
from services.output_serializer import serialize_node_outputs

logger = get_logger(__name__)
router = APIRouter()


# ── POST /execute (synchronous, returns all outputs at once) ──────────────────

@router.post("/execute")
async def execute_pipeline(request_data: ExecuteRequest, request: Request) -> JSONResponse:
    registry = request.app.state.registry
    cache    = request.app.state.cache
    executor = DAGExecutor(registry=registry, cache=cache)
    tenant_id: str = getattr(request.state, "tenant_id", "")

    loop = asyncio.get_event_loop()

    collected: dict[str, dict[str, Any]] = {}
    errors: dict[str, str] = {}

    def on_done(node_id: str, result: dict[str, Any]) -> None:
        collected[node_id] = serialize_node_outputs(result)

    def on_error(node_id: str, error: str) -> None:
        errors[node_id] = error

    try:
        await loop.run_in_executor(
            None,
            lambda: executor.execute(
                request_data.pipeline,
                context={"project_path": request_data.project_path, "tenant_id": tenant_id},
                on_node_done=on_done,
                on_node_error=on_error,
                target_node_ids=request_data.target_node_ids,
            ),
        )
    except DAGExecutionError as exc:
        return JSONResponse(
            status_code=422,
            content={"status": "error", "node_id": exc.node_id, "error": exc.message, "outputs": collected},
        )

    return JSONResponse({"status": "success", "outputs": collected, "errors": errors})


# ── WebSocket /ws (streaming status per node) ─────────────────────────────────

@router.websocket("/ws")
async def websocket_execute(websocket: WebSocket) -> None:
    await websocket.accept()
    tenant_id = websocket.cookies.get("vrl_tenant_id", "")
    logger.info("WebSocket client connected (tenant=%s)", tenant_id or "unknown")

    ws_alive = True

    async def send(msg: dict) -> None:
        nonlocal ws_alive
        if not ws_alive:
            return
        try:
            await websocket.send_json(msg)
        except Exception as exc:
            ws_alive = False
            logger.warning("WebSocket send failed (type=%s): %s", msg.get("type"), exc)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await send({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = data.get("type")

            if msg_type == "ping":
                await send({"type": "pong"})
                continue

            if msg_type == "execute":
                await _run_pipeline(websocket, data, send, tenant_id)
                continue

            await send({"type": "error", "message": f"Unknown message type: {msg_type!r}"})

    except WebSocketDisconnect:
        ws_alive = False
        logger.info("WebSocket client disconnected")
    except Exception as exc:
        ws_alive = False
        logger.error("WebSocket error: %s", exc)
        await send({"type": "error", "message": str(exc)})


async def _run_pipeline(websocket: WebSocket, data: dict, send: Any, tenant_id: str = "") -> None:
    try:
        pipeline = PipelineJSON(**data["pipeline"])
    except Exception as exc:
        await send({"type": "error", "message": f"Invalid pipeline: {exc}"})
        return

    registry = websocket.app.state.registry
    cache    = websocket.app.state.cache
    executor = DAGExecutor(registry=registry, cache=cache)
    loop     = asyncio.get_event_loop()

    CALLBACK_TIMEOUT = 15  # seconds — generous for large payloads

    # Thread-safe callbacks — use run_coroutine_threadsafe to reach the async loop
    def on_start(node_id: str) -> None:
        try:
            asyncio.run_coroutine_threadsafe(
                send({"type": "node_status", "node_id": node_id, "status": "running"}),
                loop,
            ).result(timeout=CALLBACK_TIMEOUT)
        except Exception as exc:
            logger.warning("Failed to send 'running' for node '%s': %s", node_id, exc)

    def on_done(node_id: str, result: dict[str, Any]) -> None:
        try:
            serialized = serialize_node_outputs(result)
            asyncio.run_coroutine_threadsafe(
                send({"type": "node_status", "node_id": node_id, "status": "success", "output": serialized}),
                loop,
            ).result(timeout=CALLBACK_TIMEOUT)
            logger.info("Node '%s' — status 'success' sent to client", node_id)
        except Exception as exc:
            logger.error("Failed to send 'success' for node '%s': %s", node_id, exc)

    def on_error(node_id: str, error: str) -> None:
        try:
            asyncio.run_coroutine_threadsafe(
                send({"type": "node_status", "node_id": node_id, "status": "error", "error": error}),
                loop,
            ).result(timeout=CALLBACK_TIMEOUT)
        except Exception as exc:
            logger.warning("Failed to send 'error' for node '%s': %s", node_id, exc)

    target_node_ids: list[str] | None = data.get("target_node_ids")

    await send({"type": "execution_start", "node_count": len(pipeline.nodes)})

    try:
        await loop.run_in_executor(
            None,
            lambda: executor.execute(
                pipeline,
                context={"project_path": data.get("project_path", ""), "tenant_id": tenant_id},
                on_node_start=on_start,
                on_node_done=on_done,
                on_node_error=on_error,
                target_node_ids=target_node_ids,
            ),
        )
        await send({"type": "execution_done"})
    except DAGExecutionError as exc:
        await send({"type": "execution_error", "node_id": exc.node_id, "error": exc.message})
    except Exception as exc:
        logger.error("Pipeline execution failed: %s", exc)
        await send({"type": "execution_error", "error": str(exc)})
