from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, Field


class ProjectMeta(BaseModel):
    """Metadata for a VRL project (stored as project.yaml)."""
    name: str
    description: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_modified: datetime = Field(default_factory=datetime.utcnow)
    vrl_studio_version: str = "1.0.0"
    tags: list[str] = []


class ProjectSummary(BaseModel):
    """Summary shown in the project list dashboard."""
    name: str
    path: str
    description: str = ""
    last_modified: datetime
    tags: list[str] = []


class CreateProjectRequest(BaseModel):
    name: str
    description: str = ""
    tags: list[str] = []
    template: str | None = None  # template name or None for blank


class SaveProjectRequest(BaseModel):
    project_path: str
    pipeline: dict  # PipelineJSON dict
    message: str = ""  # commit message


class CheckoutRequest(BaseModel):
    project_path: str
    commit_hash: str


class BranchRequest(BaseModel):
    project_path: str
    branch_name: str


class CommitInfo(BaseModel):
    hash: str
    message: str
    timestamp: datetime
    author: str
