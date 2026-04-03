"""Tests for models/project.py — Pydantic model validation."""
from __future__ import annotations

from datetime import datetime

from models.project import (
    BranchRequest,
    CheckoutRequest,
    CommitInfo,
    CreateProjectRequest,
    ProjectMeta,
    ProjectSummary,
    SaveProjectRequest,
)


def test_project_meta_defaults():
    meta = ProjectMeta(name="Test")
    assert meta.name == "Test"
    assert meta.description == ""
    assert meta.vrl_studio_version == "1.0.0"
    assert meta.tags == []
    assert isinstance(meta.created_at, datetime)
    assert isinstance(meta.last_modified, datetime)


def test_project_meta_full():
    meta = ProjectMeta(
        name="My Project",
        description="A test project",
        tags=["classification", "tutorial"],
        vrl_studio_version="2.0.0",
    )
    assert meta.tags == ["classification", "tutorial"]
    assert meta.vrl_studio_version == "2.0.0"


def test_project_summary():
    summary = ProjectSummary(
        name="Titanic",
        path="/home/user/vrl-projects/titanic",
        description="Classification demo",
        last_modified=datetime(2026, 1, 1),
        tags=["demo"],
    )
    assert summary.path == "/home/user/vrl-projects/titanic"


def test_create_project_request_defaults():
    req = CreateProjectRequest(name="New Project")
    assert req.template is None
    assert req.tags == []
    assert req.description == ""


def test_create_project_request_with_template():
    req = CreateProjectRequest(name="From Template", template="titanic_classification")
    assert req.template == "titanic_classification"


def test_save_project_request():
    req = SaveProjectRequest(
        project_path="/tmp/project",
        pipeline={"nodes": [], "edges": []},
        message="initial commit",
    )
    assert req.message == "initial commit"


def test_save_project_request_default_message():
    req = SaveProjectRequest(project_path="/tmp/p", pipeline={})
    assert req.message == ""


def test_checkout_request():
    req = CheckoutRequest(project_path="/tmp/p", commit_hash="abc123")
    assert req.commit_hash == "abc123"


def test_branch_request():
    req = BranchRequest(project_path="/tmp/p", branch_name="feature/new")
    assert req.branch_name == "feature/new"


def test_commit_info():
    info = CommitInfo(
        hash="abc123def",
        message="feat: add nodes",
        timestamp=datetime(2026, 4, 3, 10, 0),
        author="Dr. Tiwari",
    )
    assert info.author == "Dr. Tiwari"
