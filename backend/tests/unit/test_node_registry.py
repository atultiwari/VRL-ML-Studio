from __future__ import annotations

import pytest
import pandas as pd

from services.node_registry import NodeRegistry


class TestNodeRegistryLoading:
    def test_loads_builtin_packages(self, registry: NodeRegistry):
        assert len(registry) > 0

    def test_passthrough_is_registered(self, registry: NodeRegistry):
        ids = [m.id for m in registry.get_all_manifests()]
        assert "vrl.core.passthrough" in ids

    def test_passthrough_manifest_fields(self, registry: NodeRegistry):
        manifest = next(
            m for m in registry.get_all_manifests() if m.id == "vrl.core.passthrough"
        )
        assert manifest.name == "Passthrough"
        assert manifest.author == "VRL ML Studio"
        assert manifest.version == "1.0.0"

    def test_passthrough_has_correct_ports(self, registry: NodeRegistry):
        manifest = next(
            m for m in registry.get_all_manifests() if m.id == "vrl.core.passthrough"
        )
        input_ids = [p.id for p in manifest.inputs]
        output_ids = [p.id for p in manifest.outputs]
        assert "dataframe_in" in input_ids
        assert "dataframe_out" in output_ids

    def test_passthrough_has_no_parameters(self, registry: NodeRegistry):
        params = registry.get_parameters("vrl.core.passthrough")
        assert params == []

    def test_is_registered_true_for_known(self, registry: NodeRegistry):
        assert registry.is_registered("vrl.core.passthrough") is True

    def test_is_registered_false_for_unknown(self, registry: NodeRegistry):
        assert registry.is_registered("vrl.fake.node") is False

    def test_get_package_raises_for_unknown(self, registry: NodeRegistry):
        with pytest.raises(KeyError, match="not registered"):
            registry.dispatch("vrl.fake.node", {}, {}, {})


class TestNodeRegistryDispatch:
    def test_dispatch_passthrough_passes_dataframe(
        self, registry: NodeRegistry, sample_df: pd.DataFrame
    ):
        result = registry.dispatch(
            "vrl.core.passthrough",
            inputs={"dataframe_in": sample_df},
            parameters={},
            context={},
        )
        assert "dataframe_out" in result
        pd.testing.assert_frame_equal(result["dataframe_out"], sample_df)

    def test_dispatch_passthrough_output_is_same_object(
        self, registry: NodeRegistry, sample_df: pd.DataFrame
    ):
        result = registry.dispatch(
            "vrl.core.passthrough",
            inputs={"dataframe_in": sample_df},
            parameters={},
            context={},
        )
        # Passthrough returns the exact same DataFrame (no copy)
        assert result["dataframe_out"] is sample_df

    def test_dispatch_raises_on_missing_output_port(
        self, registry: NodeRegistry, tmp_path
    ):
        """A broken executor that omits required outputs raises ValueError."""
        broken_dir = tmp_path / "broken_node"
        broken_dir.mkdir()
        (broken_dir / "manifest.json").write_text(
            '{"id":"vrl.test.broken","name":"Broken","version":"1.0.0",'
            '"author":"test","category":"data.input","description":"test",'
            '"inputs":[],"outputs":[{"id":"dataframe_out","type":"DataFrame","label":"Out"}],'
            '"executor":"executor.py","parameters":"parameters.json","ui":"ui.json"}'
        )
        (broken_dir / "parameters.json").write_text("[]")
        (broken_dir / "ui.json").write_text('{"icon":"box","color":"#000","badge_text":"B"}')
        # Executor that returns empty dict (missing required output port)
        (broken_dir / "executor.py").write_text("def execute(inputs, parameters, context):\n    return {}\n")

        from services.node_registry import NodePackage
        from models.node import NodeManifest, NodeUISpec
        import json

        manifest = NodeManifest(**json.loads((broken_dir / "manifest.json").read_text()))
        package = NodePackage(
            manifest=manifest,
            parameters=[],
            ui=NodeUISpec(),
            package_dir=broken_dir,
            is_builtin=False,
        )
        registry.register(package)

        with pytest.raises(ValueError, match="did not return required output ports"):
            registry.dispatch("vrl.test.broken", {}, {}, {})
