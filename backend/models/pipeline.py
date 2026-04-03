from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class NodePosition(BaseModel):
    x: float
    y: float


class PipelineNode(BaseModel):
    id: str
    type: str  # manifest id, e.g. "vrl.core.csv_loader"
    label: str
    position: NodePosition
    parameters: dict[str, Any] = {}


class PipelineEdge(BaseModel):
    id: str
    source: str       # source node id
    target: str       # target node id
    sourcePort: str   # output port id on source node
    targetPort: str   # input port id on target node


class PipelineJSON(BaseModel):
    version: str = "1.0"
    nodes: list[PipelineNode] = []
    edges: list[PipelineEdge] = []

    def get_node(self, node_id: str) -> PipelineNode:
        for node in self.nodes:
            if node.id == node_id:
                return node
        raise KeyError(f"Node '{node_id}' not found in pipeline")


class ExecuteRequest(BaseModel):
    pipeline: PipelineJSON
    project_path: str = ""


class NodeStatus(BaseModel):
    node_id: str
    status: str  # "idle" | "running" | "success" | "error"
    error: str | None = None
