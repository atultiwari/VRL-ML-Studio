from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, field_validator


PORT_TYPES = Literal["DataFrame", "SplitData", "Model", "Metrics", "Plot"]

VALID_CATEGORIES = {
    "data.input",
    "data.eda",
    "preprocessing",
    "model.classification",
    "model.regression",
    "model.unsupervised",
    "evaluation.classification",
    "evaluation.regression",
    "evaluation.clustering",
}

PARAM_TYPES = Literal[
    "int",
    "float",
    "str",
    "bool",
    "select",
    "multiselect",
    "int_or_null",
    "float_or_null",
    "column_select",
    "multicolumn_select",
]

PARAM_TIERS = Literal["basic", "advanced", "hidden"]


class PortSpec(BaseModel):
    id: str
    type: PORT_TYPES
    label: str


class NodeManifest(BaseModel):
    id: str
    name: str
    version: str
    author: str
    category: str
    description: str
    inputs: list[PortSpec]
    outputs: list[PortSpec]
    executor: str
    parameters: str
    ui: str
    min_studio_version: str = "1.0.0"

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            raise ValueError(
                f"Invalid category '{v}'. Must be one of: {VALID_CATEGORIES}"
            )
        return v

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        parts = v.split(".")
        if len(parts) < 3:
            raise ValueError(
                f"Node id '{v}' must follow the format 'namespace.scope.name' "
                "(e.g., 'vrl.core.csv_loader')"
            )
        return v


class ParameterSpec(BaseModel):
    id: str
    label: str
    type: PARAM_TYPES
    default: Any = None
    min: Optional[float] = None
    max: Optional[float] = None
    options: Optional[list[str]] = None
    tier: PARAM_TIERS = "basic"


class NodeUISpec(BaseModel):
    icon: str = "box"
    color: str = "#94a3b8"
    badge_text: str = ""
