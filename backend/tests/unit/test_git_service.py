"""Tests for services/git_service.py — GitPython wrapper."""
import json
from pathlib import Path

import pytest

from services.git_service import GitService


@pytest.fixture
def project_dir(tmp_path: Path) -> Path:
    """Create a minimal project directory with pipeline.json."""
    d = tmp_path / "test-project"
    d.mkdir()
    (d / "pipeline.json").write_text(json.dumps({"version": "1.0", "nodes": [], "edges": []}))
    (d / "project.yaml").write_text("name: Test\n")
    return d


class TestInitRepo:
    def test_creates_git_repo(self, project_dir: Path) -> None:
        git = GitService(project_dir)
        git.init_repo()
        assert (project_dir / ".git").is_dir()

    def test_repo_property_after_init(self, project_dir: Path) -> None:
        git = GitService(project_dir)
        git.init_repo()
        assert git.repo is not None


class TestCommitAll:
    def test_initial_commit(self, project_dir: Path) -> None:
        git = GitService(project_dir)
        git.init_repo()
        sha = git.commit_all("initial commit")
        assert len(sha) == 40  # full hex SHA

    def test_no_changes_returns_head(self, project_dir: Path) -> None:
        git = GitService(project_dir)
        git.init_repo()
        sha1 = git.commit_all("first")
        sha2 = git.commit_all("second — no changes")
        assert sha1 == sha2  # no new commit created

    def test_detects_file_change(self, project_dir: Path) -> None:
        git = GitService(project_dir)
        git.init_repo()
        sha1 = git.commit_all("first")

        (project_dir / "pipeline.json").write_text('{"version": "1.0", "nodes": [{"id": "n1"}], "edges": []}')
        sha2 = git.commit_all("update pipeline")
        assert sha1 != sha2


class TestHistory:
    def test_returns_commits(self, project_dir: Path) -> None:
        git = GitService(project_dir)
        git.init_repo()
        git.commit_all("first commit")

        (project_dir / "pipeline.json").write_text('{"changed": true}')
        git.commit_all("second commit")

        history = git.get_history()
        assert len(history) == 2
        assert history[0]["message"] == "second commit"
        assert history[1]["message"] == "first commit"

    def test_commit_fields(self, project_dir: Path) -> None:
        git = GitService(project_dir)
        git.init_repo()
        git.commit_all("test fields")

        entry = git.get_history()[0]
        assert "hash" in entry
        assert "message" in entry
        assert "timestamp" in entry
        assert "author" in entry


class TestBranching:
    def test_create_and_list_branches(self, project_dir: Path) -> None:
        git = GitService(project_dir)
        git.init_repo()
        git.commit_all("initial")
        git.create_branch("feature-x")

        branches = git.list_branches()
        assert "main" in branches or "master" in branches
        assert "feature-x" in branches

    def test_get_current_branch(self, project_dir: Path) -> None:
        git = GitService(project_dir)
        git.init_repo()
        git.commit_all("initial")

        branch = git.get_current_branch()
        assert branch in ("main", "master")


class TestCheckout:
    def test_checkout_commit_restores_file(self, project_dir: Path) -> None:
        git = GitService(project_dir)
        git.init_repo()
        sha1 = git.commit_all("v1")

        (project_dir / "pipeline.json").write_text('{"version": "2"}')
        git.commit_all("v2")

        git.checkout_commit(sha1)
        content = json.loads((project_dir / "pipeline.json").read_text())
        assert content.get("version") == "1.0"

    def test_not_a_git_repo_raises(self, tmp_path: Path) -> None:
        git = GitService(tmp_path / "nonexistent")
        with pytest.raises(ValueError, match="Not a git repo"):
            _ = git.repo
