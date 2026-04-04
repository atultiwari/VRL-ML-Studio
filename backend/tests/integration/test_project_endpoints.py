"""Integration tests for project management endpoints."""
import json
from pathlib import Path
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from main import app


@pytest.fixture
def projects_dir(tmp_path: Path) -> Path:
    d = tmp_path / "vrl-projects"
    d.mkdir()
    return d


@pytest.fixture
async def client(projects_dir: Path):
    # Patch the tenant-scoped projects dir to use our temp dir.
    # The TenantMiddleware still runs and sets request.state.tenant_id,
    # but _tenant_projects_dir will return our temp dir regardless.
    with patch("routers.project._tenant_projects_dir", return_value=projects_dir):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as c:
            yield c


@pytest.mark.asyncio
async def test_list_projects_empty(client: AsyncClient) -> None:
    resp = await client.get("/projects")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient) -> None:
    resp = await client.post(
        "/project/create",
        params={"name": "Test Project", "description": "A test", "tags": "ml,test"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Project"
    assert "project_path" in data
    assert "pipeline" in data
    assert data["pipeline"]["version"] == "1.0"

    # Verify directory structure
    path = Path(data["project_path"])
    assert (path / "pipeline.json").exists()
    assert (path / "project.yaml").exists()
    assert (path / "data").is_dir()
    assert (path / "outputs").is_dir()
    assert (path / ".git").is_dir()
    assert (path / ".gitignore").exists()


@pytest.mark.asyncio
async def test_create_duplicate_project(client: AsyncClient) -> None:
    await client.post("/project/create", params={"name": "Dupe"})
    resp = await client.post("/project/create", params={"name": "Dupe"})
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_save_and_history(client: AsyncClient) -> None:
    # Create project
    create_resp = await client.post("/project/create", params={"name": "History Test"})
    project_path = create_resp.json()["project_path"]

    # Save with a pipeline change
    pipeline = {"version": "1.0", "nodes": [{"id": "n1", "type": "test"}], "edges": []}
    save_resp = await client.post("/project/save", json={
        "project_path": project_path,
        "pipeline": pipeline,
        "message": "added node n1",
    })
    assert save_resp.status_code == 200
    assert "commit_hash" in save_resp.json()

    # Check history
    hist_resp = await client.get("/project/history", params={"project_path": project_path})
    assert hist_resp.status_code == 200
    history = hist_resp.json()
    assert len(history) >= 2  # initial + save
    assert "added node n1" in history[0]["message"]


@pytest.mark.asyncio
async def test_checkout_restores_pipeline(client: AsyncClient) -> None:
    # Create and save two versions
    create_resp = await client.post("/project/create", params={"name": "Checkout Test"})
    project_path = create_resp.json()["project_path"]

    pipeline_v1 = {"version": "1.0", "nodes": [], "edges": []}
    await client.post("/project/save", json={
        "project_path": project_path,
        "pipeline": pipeline_v1,
        "message": "v1",
    })

    pipeline_v2 = {"version": "1.0", "nodes": [{"id": "n1"}], "edges": []}
    await client.post("/project/save", json={
        "project_path": project_path,
        "pipeline": pipeline_v2,
        "message": "v2",
    })

    # Get history and checkout v1
    hist = (await client.get("/project/history", params={"project_path": project_path})).json()
    # Find the v1 commit (message contains "v1")
    v1_commit = next(h for h in hist if "v1" in h["message"])

    checkout_resp = await client.post("/project/checkout", params={
        "project_path": project_path,
        "commit_hash": v1_commit["hash"],
    })
    assert checkout_resp.status_code == 200
    restored = checkout_resp.json()["pipeline"]
    assert len(restored.get("nodes", [])) == 0


@pytest.mark.asyncio
async def test_project_info(client: AsyncClient) -> None:
    create_resp = await client.post("/project/create", params={"name": "Info Test"})
    project_path = create_resp.json()["project_path"]

    resp = await client.get("/project/info", params={"project_path": project_path})
    assert resp.status_code == 200
    info = resp.json()
    assert info["name"] == "Info Test"
    assert "branch" in info
    assert "pipeline" in info


@pytest.mark.asyncio
async def test_list_templates(client: AsyncClient) -> None:
    resp = await client.get("/project/templates")
    assert resp.status_code == 200
    templates = resp.json()
    assert isinstance(templates, list)
    # Should have at least blank + the 4 starter templates
    names = [t["id"] for t in templates]
    assert "blank" in names


@pytest.mark.asyncio
async def test_list_projects_after_create(client: AsyncClient) -> None:
    await client.post("/project/create", params={"name": "Listed Project"})
    resp = await client.get("/projects")
    assert resp.status_code == 200
    projects = resp.json()
    assert len(projects) == 1
    assert projects[0]["name"] == "Listed Project"
