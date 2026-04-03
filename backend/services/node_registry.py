from __future__ import annotations

import importlib.util
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from core.logging import get_logger
from core.settings import settings
from models.node import NodeManifest, NodeUISpec, ParameterSpec

logger = get_logger(__name__)


@dataclass
class NodePackage:
    """A loaded, validated node package ready for execution."""

    manifest: NodeManifest
    parameters: list[ParameterSpec]
    ui: NodeUISpec
    package_dir: Path
    is_builtin: bool


class NodeRegistry:
    """Loads, validates, and dispatches node packages.

    All built-in and custom nodes are loaded through the same code path.
    Built-in nodes live in backend/node_packages/builtin/.
    Custom nodes live in <project>/node_packages/.
    """

    def __init__(self) -> None:
        self._packages: dict[str, NodePackage] = {}

    # ── Loading ───────────────────────────────────────────────────────────────

    def load_builtin_packages(self) -> None:
        builtin_dir = settings.builtin_packages_dir
        if not builtin_dir.exists():
            logger.warning("Builtin packages directory not found: %s", builtin_dir)
            return
        self._load_from_directory(builtin_dir, is_builtin=True)
        logger.info("Loaded %d builtin node packages", len(self._packages))

    def load_project_packages(self, project_path: str) -> None:
        project_nodes_dir = Path(project_path) / "node_packages"
        if not project_nodes_dir.exists():
            return
        before = len(self._packages)
        self._load_from_directory(project_nodes_dir, is_builtin=False)
        added = len(self._packages) - before
        if added:
            logger.info("Loaded %d custom node packages from project '%s'", added, project_path)

    def _load_from_directory(self, directory: Path, is_builtin: bool) -> None:
        for pkg_dir in directory.iterdir():
            if not pkg_dir.is_dir():
                continue
            try:
                package = self._load_package(pkg_dir, is_builtin=is_builtin)
                self.register(package)
            except Exception as exc:
                logger.error("Failed to load node package '%s': %s", pkg_dir.name, exc)

    def _load_package(self, pkg_dir: Path, is_builtin: bool) -> NodePackage:
        manifest_path = pkg_dir / "manifest.json"
        if not manifest_path.exists():
            raise FileNotFoundError(f"manifest.json not found in {pkg_dir}")

        with manifest_path.open() as f:
            manifest_data = json.load(f)
        manifest = NodeManifest(**manifest_data)

        self._validate_studio_version(manifest)

        params_path = pkg_dir / manifest.parameters
        if not params_path.exists():
            raise FileNotFoundError(f"{manifest.parameters} not found in {pkg_dir}")
        with params_path.open() as f:
            params_data = json.load(f)
        parameters = [ParameterSpec(**p) for p in params_data]

        ui_path = pkg_dir / manifest.ui
        if not ui_path.exists():
            raise FileNotFoundError(f"{manifest.ui} not found in {pkg_dir}")
        with ui_path.open() as f:
            ui_data = json.load(f)
        ui = NodeUISpec(**ui_data)

        executor_path = pkg_dir / manifest.executor
        if not executor_path.exists():
            raise FileNotFoundError(f"{manifest.executor} not found in {pkg_dir}")

        return NodePackage(
            manifest=manifest,
            parameters=parameters,
            ui=ui,
            package_dir=pkg_dir,
            is_builtin=is_builtin,
        )

    def _validate_studio_version(self, manifest: NodeManifest) -> None:
        from packaging.version import Version
        try:
            min_ver = Version(manifest.min_studio_version)
            studio_ver = Version(settings.vrl_studio_version)
            if studio_ver < min_ver:
                raise ValueError(
                    f"Node '{manifest.id}' requires studio >= {manifest.min_studio_version}, "
                    f"but running {settings.vrl_studio_version}"
                )
        except ImportError:
            # packaging not available — skip version check
            pass

    # ── Registration ──────────────────────────────────────────────────────────

    def register(self, package: NodePackage) -> None:
        if package.manifest.id in self._packages:
            existing = self._packages[package.manifest.id]
            if not existing.is_builtin:
                logger.warning(
                    "Replacing existing node '%s' with new package from '%s'",
                    package.manifest.id,
                    package.package_dir,
                )
        self._packages[package.manifest.id] = package
        logger.info("Registered node '%s' (%s)", package.manifest.id, package.manifest.name)

    # ── Dispatch ──────────────────────────────────────────────────────────────

    def dispatch(
        self,
        node_type: str,
        inputs: dict[str, Any],
        parameters: dict[str, Any],
        context: dict[str, Any],
    ) -> dict[str, Any]:
        """Load and execute a node's executor.py::execute() function."""
        package = self._get_package(node_type)
        execute_fn = self._load_executor(package)
        result = execute_fn(inputs, parameters, context)
        self._validate_outputs(node_type, result, package.manifest)
        return result

    def _get_package(self, node_type: str) -> NodePackage:
        if node_type not in self._packages:
            available = sorted(self._packages.keys())
            raise KeyError(
                f"Node type '{node_type}' is not registered. "
                f"Available nodes: {available}"
            )
        return self._packages[node_type]

    def _load_executor(self, package: NodePackage):
        executor_path = package.package_dir / package.manifest.executor
        spec = importlib.util.spec_from_file_location(
            f"vrl_node_{package.manifest.id.replace('.', '_')}",
            executor_path,
        )
        if spec is None or spec.loader is None:
            raise ImportError(f"Cannot load executor at {executor_path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)  # type: ignore[union-attr]

        if not hasattr(module, "execute"):
            raise AttributeError(
                f"executor.py for node '{package.manifest.id}' must define "
                "an 'execute(inputs, parameters, context) -> dict' function"
            )
        return module.execute

    def _validate_outputs(
        self, node_type: str, result: dict[str, Any], manifest: NodeManifest
    ) -> None:
        expected_ports = {port.id for port in manifest.outputs}
        returned_ports = set(result.keys())
        missing = expected_ports - returned_ports
        if missing:
            raise ValueError(
                f"Node '{node_type}' executor did not return required output ports: {missing}. "
                f"Expected: {expected_ports}, got: {returned_ports}"
            )

    # ── Queries ───────────────────────────────────────────────────────────────

    def get_all_manifests(self) -> list[NodeManifest]:
        return [pkg.manifest for pkg in self._packages.values()]

    def get_all_packages(self) -> list[NodePackage]:
        return list(self._packages.values())

    def get_package(self, node_type: str) -> NodePackage:
        return self._get_package(node_type)

    def get_parameters(self, node_type: str) -> list[ParameterSpec]:
        return self._get_package(node_type).parameters

    def is_registered(self, node_type: str) -> bool:
        return node_type in self._packages

    def __len__(self) -> int:
        return len(self._packages)
