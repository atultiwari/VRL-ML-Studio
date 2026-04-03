from __future__ import annotations

import os
from pathlib import Path

from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    backend_reload: bool = True
    vrl_projects_dir: str = str(Path.home() / "vrl-projects")
    vrl_studio_version: str = "1.0.0"

    # Absolute path to the builtin node packages directory
    @property
    def builtin_packages_dir(self) -> Path:
        return Path(__file__).parent.parent / "node_packages" / "builtin"

    # Allowlist of packages custom node executors may import
    allowed_executor_packages: list[str] = [
        "scikit-learn",
        "sklearn",
        "xgboost",
        "pandas",
        "numpy",
        "scipy",
        "plotly",
        "matplotlib",
        "statsmodels",
    ]


settings = Settings()
