"""Integration tests for POST /execute and WebSocket /ws endpoints."""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


# ── POST /execute ──────────────────────────────────────────────────────────


def test_execute_single_passthrough(client: TestClient):
    """Execute a single passthrough node via POST /execute."""
    pipeline = {
        "nodes": [
            {
                "id": "n1",
                "type": "vrl.core.sample_dataset",
                "label": "Iris",
                "position": {"x": 0, "y": 0},
                "parameters": {"dataset": "iris"},
            }
        ],
        "edges": [],
    }
    resp = client.post("/execute", json={"pipeline": pipeline, "project_path": ""})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "success"
    assert "n1" in body["outputs"]
    assert body["outputs"]["n1"]["dataframe_out"]["type"] == "dataframe"


def test_execute_two_node_pipeline(client: TestClient):
    """Sample dataset → Data profiler."""
    pipeline = {
        "nodes": [
            {
                "id": "n1",
                "type": "vrl.core.sample_dataset",
                "label": "Iris",
                "position": {"x": 0, "y": 0},
                "parameters": {"dataset": "iris"},
            },
            {
                "id": "n2",
                "type": "vrl.core.data_profiler",
                "label": "Profiler",
                "position": {"x": 0, "y": 200},
                "parameters": {},
            },
        ],
        "edges": [
            {
                "id": "e1",
                "source": "n1",
                "target": "n2",
                "sourcePort": "dataframe_out",
                "targetPort": "dataframe_in",
            }
        ],
    }
    resp = client.post("/execute", json={"pipeline": pipeline, "project_path": ""})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "success"
    assert "n2" in body["outputs"]


def test_execute_unknown_node_type(client: TestClient):
    """Executing a pipeline with an unregistered node type fails gracefully."""
    pipeline = {
        "nodes": [
            {
                "id": "n1",
                "type": "vrl.core.nonexistent_node",
                "label": "Bad",
                "position": {"x": 0, "y": 0},
                "parameters": {},
            }
        ],
        "edges": [],
    }
    resp = client.post("/execute", json={"pipeline": pipeline, "project_path": ""})
    assert resp.status_code == 422
    body = resp.json()
    assert body["status"] == "error"
    assert body["node_id"] == "n1"


def test_execute_empty_pipeline(client: TestClient):
    """Empty pipeline returns success with no outputs."""
    resp = client.post("/execute", json={"pipeline": {"nodes": [], "edges": []}, "project_path": ""})
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"
    assert resp.json()["outputs"] == {}


# ── WebSocket /ws ──────────────────────────────────────────────────────────


def test_ws_ping_pong(client: TestClient):
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({"type": "ping"}))
        resp = ws.receive_json()
        assert resp["type"] == "pong"


def test_ws_invalid_json(client: TestClient):
    with client.websocket_connect("/ws") as ws:
        ws.send_text("not json at all")
        resp = ws.receive_json()
        assert resp["type"] == "error"
        assert "Invalid JSON" in resp["message"]


def test_ws_unknown_message_type(client: TestClient):
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({"type": "foobar"}))
        resp = ws.receive_json()
        assert resp["type"] == "error"
        assert "Unknown" in resp["message"]


def test_ws_execute_pipeline(client: TestClient):
    """Stream a simple pipeline execution over WebSocket."""
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({
            "type": "execute",
            "pipeline": {
                "nodes": [
                    {
                        "id": "n1",
                        "type": "vrl.core.sample_dataset",
                        "label": "Iris",
                        "position": {"x": 0, "y": 0},
                        "parameters": {"dataset": "iris"},
                    }
                ],
                "edges": [],
            },
        }))
        # Collect messages until execution_done
        messages = []
        for _ in range(10):
            msg = ws.receive_json()
            messages.append(msg)
            if msg["type"] in ("execution_done", "execution_error"):
                break

        types = [m["type"] for m in messages]
        assert "execution_start" in types
        assert "execution_done" in types
        # Should have at least one node_status
        status_msgs = [m for m in messages if m["type"] == "node_status"]
        assert len(status_msgs) >= 1
        assert status_msgs[-1]["status"] == "success"


def test_ws_execute_invalid_pipeline(client: TestClient):
    """Sending a malformed pipeline (missing 'pipeline' key) returns an error."""
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({
            "type": "execute",
            # No "pipeline" key at all — triggers KeyError in _run_pipeline
        }))
        resp = ws.receive_json()
        assert resp["type"] == "error"
