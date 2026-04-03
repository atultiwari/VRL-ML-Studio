"""Integration tests for node package import/export endpoints."""

from __future__ import annotations

import io
import json
import zipfile

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _make_vrlnode_zip(
    pkg_name: str = "test_node",
    manifest: dict | None = None,
    executor_code: str = "def execute(inputs, parameters, context):\n    return {}\n",
    parameters: list | None = None,
    ui: dict | None = None,
    extra_files: dict[str, bytes] | None = None,
    flat: bool = False,
) -> io.BytesIO:
    """Build a .vrlnode zip archive in memory."""
    if manifest is None:
        manifest = {
            "id": "vrl.custom.test_node",
            "name": "Test Node",
            "version": "1.0.0",
            "author": "Test",
            "category": "data.input",
            "description": "A test node",
            "inputs": [],
            "outputs": [
                {"id": "dataframe_out", "type": "DataFrame", "label": "Out"}
            ],
            "executor": "executor.py",
            "parameters": "parameters.json",
            "ui": "ui.json",
            "min_studio_version": "1.0.0",
        }
    if parameters is None:
        parameters = []
    if ui is None:
        ui = {"icon": "box", "color": "#888888", "badge_text": "T"}

    buf = io.BytesIO()
    prefix = "" if flat else f"{pkg_name}/"

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(f"{prefix}manifest.json", json.dumps(manifest))
        zf.writestr(f"{prefix}executor.py", executor_code)
        zf.writestr(f"{prefix}parameters.json", json.dumps(parameters))
        zf.writestr(f"{prefix}ui.json", json.dumps(ui))
        if extra_files:
            for name, data in extra_files.items():
                zf.writestr(f"{prefix}{name}", data)

    buf.seek(0)
    return buf


# ── Import tests ───────────────────────────────────────────────────────────


def test_import_valid_package(client: TestClient, tmp_path):
    buf = _make_vrlnode_zip()
    resp = client.post(
        "/nodes/import",
        files={"file": ("test_node.vrlnode", buf, "application/zip")},
        params={"project_path": str(tmp_path)},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["id"] == "vrl.custom.test_node"
    assert body["name"] == "Test Node"
    assert (tmp_path / "node_packages" / "test_node" / "manifest.json").exists()
    assert (tmp_path / "node_packages" / "test_node" / "executor.py").exists()


def test_import_bad_zip(client: TestClient, tmp_path):
    resp = client.post(
        "/nodes/import",
        files={"file": ("bad.vrlnode", io.BytesIO(b"not a zip"), "application/zip")},
        params={"project_path": str(tmp_path)},
    )
    assert resp.status_code == 400
    assert "Invalid zip" in resp.json()["detail"]


def test_import_path_traversal(client: TestClient, tmp_path):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("../etc/evil.py", "import os; os.system('rm -rf /')")
    buf.seek(0)

    resp = client.post(
        "/nodes/import",
        files={"file": ("evil.vrlnode", buf, "application/zip")},
        params={"project_path": str(tmp_path)},
    )
    assert resp.status_code == 400
    assert "Path traversal" in resp.json()["detail"]


def test_import_missing_required_file(client: TestClient, tmp_path):
    """Zip with manifest.json but missing executor.py."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(
            "my_node/manifest.json",
            json.dumps({
                "id": "vrl.custom.incomplete",
                "name": "Incomplete",
                "version": "1.0.0",
                "author": "Test",
                "category": "data.input",
                "description": "Missing executor",
                "inputs": [],
                "outputs": [],
                "executor": "executor.py",
                "parameters": "parameters.json",
                "ui": "ui.json",
                "min_studio_version": "1.0.0",
            }),
        )
        zf.writestr("my_node/parameters.json", "[]")
        zf.writestr("my_node/ui.json", '{"icon":"x","color":"#000","badge_text":"X"}')
        # deliberately omitting executor.py
    buf.seek(0)

    resp = client.post(
        "/nodes/import",
        files={"file": ("incomplete.vrlnode", buf, "application/zip")},
        params={"project_path": str(tmp_path)},
    )
    assert resp.status_code == 400
    assert "Missing required file" in resp.json()["detail"]


def test_import_invalid_manifest(client: TestClient, tmp_path):
    """Manifest with invalid JSON schema (missing required fields)."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("bad_node/manifest.json", json.dumps({"id": "only_id"}))
        zf.writestr("bad_node/executor.py", "def execute(i,p,c): return {}")
        zf.writestr("bad_node/parameters.json", "[]")
        zf.writestr("bad_node/ui.json", '{"icon":"x","color":"#000","badge_text":"X"}')
    buf.seek(0)

    resp = client.post(
        "/nodes/import",
        files={"file": ("bad_node.vrlnode", buf, "application/zip")},
        params={"project_path": str(tmp_path)},
    )
    assert resp.status_code == 400
    assert "Invalid manifest" in resp.json()["detail"]


def test_import_node_appears_in_list(client: TestClient, tmp_path):
    """After import, the node should appear in GET /nodes."""
    buf = _make_vrlnode_zip(
        pkg_name="list_test",
        manifest={
            "id": "vrl.custom.list_test",
            "name": "List Test Node",
            "version": "1.0.0",
            "author": "Test",
            "category": "data.input",
            "description": "Test listing",
            "inputs": [],
            "outputs": [
                {"id": "dataframe_out", "type": "DataFrame", "label": "Out"}
            ],
            "executor": "executor.py",
            "parameters": "parameters.json",
            "ui": "ui.json",
            "min_studio_version": "1.0.0",
        },
    )
    import_resp = client.post(
        "/nodes/import",
        files={"file": ("list_test.vrlnode", buf, "application/zip")},
        params={"project_path": str(tmp_path)},
    )
    assert import_resp.status_code == 201

    nodes_resp = client.get("/nodes")
    assert nodes_resp.status_code == 200
    node_ids = [n["id"] for n in nodes_resp.json()]
    assert "vrl.custom.list_test" in node_ids


# ── Export tests ───────────────────────────────────────────────────────────


def test_export_builtin_node(client: TestClient):
    """Export a known builtin node (passthrough) as .vrlnode."""
    resp = client.get("/nodes/export/vrl.core.passthrough")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/zip"
    assert "vrl_core_passthrough.vrlnode" in resp.headers.get("content-disposition", "")

    zf = zipfile.ZipFile(io.BytesIO(resp.content))
    names = zf.namelist()
    assert any("manifest.json" in n for n in names)
    assert any("executor.py" in n for n in names)


def test_export_nonexistent_node(client: TestClient):
    resp = client.get("/nodes/export/vrl.core.nonexistent")
    assert resp.status_code == 404


def test_export_excludes_pycache(client: TestClient):
    """Exported zip should not contain __pycache__ or .pyc files."""
    resp = client.get("/nodes/export/vrl.core.passthrough")
    assert resp.status_code == 200
    zf = zipfile.ZipFile(io.BytesIO(resp.content))
    for name in zf.namelist():
        assert "__pycache__" not in name
        assert not name.endswith(".pyc")


# ── Round-trip test ────────────────────────────────────────────────────────


def test_import_export_roundtrip(client: TestClient, tmp_path):
    """Import a custom node, then export it — the manifest should survive."""
    original_manifest = {
        "id": "vrl.custom.roundtrip",
        "name": "Roundtrip Node",
        "version": "2.0.0",
        "author": "Test Author",
        "category": "preprocessing",
        "description": "Tests import/export round-trip",
        "inputs": [
            {"id": "dataframe_in", "type": "DataFrame", "label": "In"}
        ],
        "outputs": [
            {"id": "dataframe_out", "type": "DataFrame", "label": "Out"}
        ],
        "executor": "executor.py",
        "parameters": "parameters.json",
        "ui": "ui.json",
        "min_studio_version": "1.0.0",
    }

    buf = _make_vrlnode_zip(
        pkg_name="roundtrip",
        manifest=original_manifest,
        executor_code="def execute(inputs, parameters, context):\n    return {'dataframe_out': inputs['dataframe_in']}\n",
    )

    # Import
    import_resp = client.post(
        "/nodes/import",
        files={"file": ("roundtrip.vrlnode", buf, "application/zip")},
        params={"project_path": str(tmp_path)},
    )
    assert import_resp.status_code == 201

    # Export
    export_resp = client.get("/nodes/export/vrl.custom.roundtrip")
    assert export_resp.status_code == 200

    # Verify manifest inside exported zip matches
    zf = zipfile.ZipFile(io.BytesIO(export_resp.content))
    manifest_entry = [n for n in zf.namelist() if n.endswith("manifest.json")][0]
    exported_manifest = json.loads(zf.read(manifest_entry))
    assert exported_manifest["id"] == "vrl.custom.roundtrip"
    assert exported_manifest["version"] == "2.0.0"
    assert exported_manifest["author"] == "Test Author"


# ── Installed endpoint ─────────────────────────────────────────────────────


def test_installed_groups_nodes(client: TestClient):
    resp = client.get("/nodes/installed")
    assert resp.status_code == 200
    body = resp.json()
    assert "builtin" in body
    assert "custom" in body
    assert len(body["builtin"]) >= 1
