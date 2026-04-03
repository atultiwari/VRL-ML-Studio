from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_health_returns_ok(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "version" in body
    assert "nodes_loaded" in body


def test_health_nodes_loaded(client: TestClient):
    response = client.get("/health")
    body = response.json()
    assert body["nodes_loaded"] >= 1  # at least passthrough is loaded
