from __future__ import annotations

from collections import defaultdict, deque
from typing import Any

from core.logging import get_logger
from models.pipeline import PipelineEdge, PipelineJSON, PipelineNode
from services.cache import CacheService
from services.node_registry import NodeRegistry

logger = get_logger(__name__)


class DAGExecutionError(Exception):
    """Raised when pipeline execution fails."""

    def __init__(self, node_id: str, message: str) -> None:
        self.node_id = node_id
        self.message = message
        super().__init__(f"Node '{node_id}' failed: {message}")


class DAGExecutor:
    """Executes a pipeline DAG by dispatching nodes in topological order.

    Features:
    - Topological sort (Kahn's algorithm) — detects cycles
    - Cache-aware: skips re-execution when output is already cached
    - Partial re-execution: only invalidated nodes are re-run
    - Routes outputs between nodes via typed port connections
    """

    def __init__(self, registry: NodeRegistry, cache: CacheService) -> None:
        self.registry = registry
        self.cache = cache

    def execute(
        self,
        pipeline: PipelineJSON,
        context: dict[str, Any] | None = None,
        on_node_start: Any = None,
        on_node_done: Any = None,
        on_node_error: Any = None,
        target_node_ids: list[str] | None = None,
    ) -> dict[str, dict[str, Any]]:
        """Execute nodes in the pipeline.

        Args:
            pipeline: The pipeline to execute.
            context:  Runtime context dict passed to each executor.
            on_node_start/done/error: Optional async callbacks for status streaming.
            target_node_ids: If provided, only execute these nodes and their
                             ancestors (upstream dependencies). When None, all
                             nodes are executed.

        Returns:
            Dict mapping node_id → output dict for every executed node.
        """
        if context is None:
            context = {}

        order = self.topological_sort(pipeline.nodes, pipeline.edges)

        # Filter to ancestor subgraph when target nodes are specified
        if target_node_ids:
            required = self._collect_ancestors(target_node_ids, pipeline.edges, {n.id for n in pipeline.nodes})
            order = [nid for nid in order if nid in required]
            logger.info("Targeted execution — running %d of %d nodes", len(order), len(pipeline.nodes))
        logger.info("Execution order: %s", order)

        # Map: node_id → its execution output (from cache or fresh)
        outputs: dict[str, dict[str, Any]] = {}

        for node_id in order:
            node = pipeline.get_node(node_id)

            tenant_id = context.get("tenant_id", "")
            cached = self.cache.get(node_id, node.parameters, tenant_id=tenant_id)
            if cached is not None:
                outputs[node_id] = cached
                logger.info("Node '%s' — using cached output", node_id)
                if on_node_done:
                    on_node_done(node_id, cached)
                continue

            inputs = self._build_inputs(node_id, pipeline.edges, outputs)
            node_context = {**context, "node_id": node_id}

            logger.info("Node '%s' — executing", node_id)
            if on_node_start:
                on_node_start(node_id)

            try:
                result = self.registry.dispatch(
                    node.type, inputs, node.parameters, node_context
                )
            except Exception as exc:
                logger.error("Node '%s' failed: %s", node_id, exc)
                if on_node_error:
                    on_node_error(node_id, str(exc))
                raise DAGExecutionError(node_id, str(exc)) from exc

            self.cache.set(node_id, node.parameters, result, tenant_id=tenant_id)
            outputs[node_id] = result

            if on_node_done:
                on_node_done(node_id, result)

        return outputs

    def _build_inputs(
        self,
        node_id: str,
        edges: list[PipelineEdge],
        outputs: dict[str, dict[str, Any]],
    ) -> dict[str, Any]:
        """Collect the upstream output values this node needs as inputs."""
        inputs: dict[str, Any] = {}
        for edge in edges:
            if edge.target == node_id:
                source_output = outputs.get(edge.source, {})
                value = source_output.get(edge.sourcePort)
                if value is None:
                    raise ValueError(
                        f"Edge '{edge.id}': source node '{edge.source}' port "
                        f"'{edge.sourcePort}' produced no output"
                    )
                inputs[edge.targetPort] = value
        return inputs

    # ── Ancestor collection (for targeted execution) ─────────────────────────

    @staticmethod
    def _collect_ancestors(
        target_ids: list[str],
        edges: list[PipelineEdge],
        all_node_ids: set[str],
    ) -> set[str]:
        """Return the set of target nodes plus all their transitive ancestors."""
        # Build reverse adjacency: child → set of parents
        parents: dict[str, list[str]] = defaultdict(list)
        for edge in edges:
            parents[edge.target].append(edge.source)

        required: set[str] = set()
        queue: deque[str] = deque()

        for nid in target_ids:
            if nid in all_node_ids:
                queue.append(nid)

        while queue:
            nid = queue.popleft()
            if nid in required:
                continue
            required.add(nid)
            for parent in parents.get(nid, []):
                if parent not in required:
                    queue.append(parent)

        return required

    # ── Topological Sort (Kahn's Algorithm) ──────────────────────────────────

    def topological_sort(
        self,
        nodes: list[PipelineNode],
        edges: list[PipelineEdge],
    ) -> list[str]:
        """Return node ids in topological execution order.

        Raises ValueError if the graph contains a cycle.
        """
        node_ids = {n.id for n in nodes}
        in_degree: dict[str, int] = {nid: 0 for nid in node_ids}
        adjacency: dict[str, list[str]] = defaultdict(list)

        for edge in edges:
            if edge.source not in node_ids or edge.target not in node_ids:
                raise ValueError(
                    f"Edge '{edge.id}' references unknown node(s): "
                    f"source='{edge.source}', target='{edge.target}'"
                )
            adjacency[edge.source].append(edge.target)
            in_degree[edge.target] += 1

        queue: deque[str] = deque(
            nid for nid in node_ids if in_degree[nid] == 0
        )
        order: list[str] = []

        while queue:
            node_id = queue.popleft()
            order.append(node_id)
            for neighbor in adjacency[node_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(order) != len(node_ids):
            cycle_nodes = [nid for nid in node_ids if nid not in order]
            raise ValueError(
                f"Pipeline contains a cycle involving nodes: {cycle_nodes}"
            )

        return order
