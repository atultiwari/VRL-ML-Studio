from __future__ import annotations

import hashlib
import json
from typing import Any

from core.logging import get_logger

logger = get_logger(__name__)


class CacheService:
    """In-memory cache for node execution outputs.

    Key is derived from node_id + a hash of its parameters so that
    changing a parameter automatically invalidates that node's cache entry.
    """

    def __init__(self) -> None:
        self._store: dict[str, Any] = {}

    def make_key(self, node_id: str, parameters: dict[str, Any]) -> str:
        param_hash = hashlib.md5(
            json.dumps(parameters, sort_keys=True, default=str).encode()
        ).hexdigest()
        return f"{node_id}:{param_hash}"

    def get(self, node_id: str, parameters: dict[str, Any]) -> Any | None:
        key = self.make_key(node_id, parameters)
        value = self._store.get(key)
        if value is not None:
            logger.info("Cache HIT for node '%s'", node_id)
        return value

    def set(self, node_id: str, parameters: dict[str, Any], value: Any) -> None:
        key = self.make_key(node_id, parameters)
        self._store[key] = value
        logger.info("Cache SET for node '%s'", node_id)

    def invalidate_node(self, node_id: str) -> None:
        """Remove all cache entries for a specific node."""
        keys_to_delete = [k for k in self._store if k.startswith(f"{node_id}:")]
        for key in keys_to_delete:
            del self._store[key]
        if keys_to_delete:
            logger.info("Cache INVALIDATED %d entries for node '%s'", len(keys_to_delete), node_id)

    def clear(self) -> None:
        self._store.clear()
        logger.info("Cache CLEARED")

    def __len__(self) -> int:
        return len(self._store)
