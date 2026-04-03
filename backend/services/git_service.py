"""Git operations wrapper using GitPython — one git repo per VRL project."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from git import Actor, Repo, InvalidGitRepositoryError, GitCommandError, NoSuchPathError

from core.logging import get_logger

logger = get_logger(__name__)


class GitService:
    """Thin wrapper around GitPython for VRL project repos."""

    def __init__(self, project_path: str | Path) -> None:
        self.path = Path(project_path)
        self._repo: Repo | None = None

    @property
    def repo(self) -> Repo:
        if self._repo is None:
            try:
                self._repo = Repo(self.path)
            except (InvalidGitRepositoryError, NoSuchPathError):
                raise ValueError(f"Not a git repo: {self.path}")
        return self._repo

    # ── Initialisation ───────────────────────────────────────────────────────

    def init_repo(self) -> Repo:
        """Initialise a new git repo at self.path and return it."""
        self._repo = Repo.init(self.path)
        logger.info("Initialised git repo at %s", self.path)
        return self._repo

    # ── Commit operations ────────────────────────────────────────────────────

    def commit_all(self, message: str, author_name: str = "VRL ML Studio") -> str:
        """Stage all tracked + untracked files and commit.

        Returns the commit hash.
        """
        repo = self.repo
        actor = Actor(author_name, "studio@vrl.local")

        # Add all files (respects .gitignore)
        repo.git.add(A=True)

        # Check if there are changes to commit
        if repo.head.is_valid() and not repo.is_dirty(untracked_files=True):
            logger.info("No changes to commit in %s", self.path)
            return str(repo.head.commit.hexsha)

        repo.index.commit(message, author=actor, committer=actor)
        commit_hash = str(repo.head.commit.hexsha)
        logger.info("Committed '%s' → %s", message, commit_hash[:8])
        return commit_hash

    # ── History ──────────────────────────────────────────────────────────────

    def get_history(self, max_count: int = 50) -> list[dict[str, Any]]:
        """Return recent commit history as a list of dicts."""
        commits = []
        for commit in self.repo.iter_commits(max_count=max_count):
            commits.append({
                "hash": commit.hexsha,
                "message": commit.message.strip(),
                "timestamp": datetime.fromtimestamp(
                    commit.committed_date, tz=timezone.utc
                ).isoformat(),
                "author": str(commit.author),
            })
        return commits

    # ── Checkout ─────────────────────────────────────────────────────────────

    def checkout_commit(self, commit_hash: str) -> None:
        """Check out a specific commit (detached HEAD)."""
        self.repo.git.checkout(commit_hash)
        logger.info("Checked out %s in %s", commit_hash[:8], self.path)

    def checkout_branch(self, branch_name: str) -> None:
        """Switch to an existing branch."""
        self.repo.git.checkout(branch_name)
        logger.info("Switched to branch '%s'", branch_name)

    # ── Branching ────────────────────────────────────────────────────────────

    def create_branch(self, branch_name: str) -> str:
        """Create a new branch from current HEAD and switch to it."""
        self.repo.git.checkout("-b", branch_name)
        logger.info("Created and switched to branch '%s'", branch_name)
        return branch_name

    def get_current_branch(self) -> str:
        """Return the current branch name, or 'detached' if HEAD is detached."""
        try:
            return str(self.repo.active_branch)
        except TypeError:
            return "detached"

    def list_branches(self) -> list[str]:
        """Return all local branch names."""
        return [str(b) for b in self.repo.branches]
