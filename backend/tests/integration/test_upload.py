"""Integration tests for POST /upload — file upload endpoint."""
from __future__ import annotations

import io

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_upload_csv(client: TestClient):
    csv_content = b"a,b,c\n1,2,3\n4,5,6\n"
    resp = client.post(
        "/upload",
        files={"file": ("test.csv", io.BytesIO(csv_content), "text/csv")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "test.csv"
    assert body["size"] == len(csv_content)
    assert "path" in body


def test_upload_xlsx(client: TestClient):
    # Minimal xlsx content (just needs to pass extension check)
    resp = client.post(
        "/upload",
        files={"file": ("data.xlsx", io.BytesIO(b"fake xlsx content"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "data.xlsx"


def test_upload_unsupported_extension(client: TestClient):
    resp = client.post(
        "/upload",
        files={"file": ("script.py", io.BytesIO(b"print('hi')"), "text/plain")},
    )
    assert resp.status_code == 400
    assert "Unsupported file type" in resp.json()["detail"]


def test_upload_duplicate_names(client: TestClient):
    """Uploading the same filename twice should not overwrite."""
    csv = b"x\n1\n"
    resp1 = client.post("/upload", files={"file": ("dup.csv", io.BytesIO(csv), "text/csv")})
    resp2 = client.post("/upload", files={"file": ("dup.csv", io.BytesIO(csv), "text/csv")})
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert resp1.json()["path"] != resp2.json()["path"]
