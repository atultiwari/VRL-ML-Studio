"""Code snippet for Preprocess node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    method = params.get("method", "standard")
    columns = params.get("columns", [])

    scaler_map = {
        "standard": ("StandardScaler", "StandardScaler"),
        "minmax": ("MinMaxScaler", "MinMaxScaler"),
        "robust": ("RobustScaler", "RobustScaler"),
    }
    cls_name, import_name = scaler_map.get(method, ("StandardScaler", "StandardScaler"))

    imports = [
        "import numpy as np",
        f"from sklearn.preprocessing import {import_name}",
    ]

    code = f'{out} = {inp}.copy()\n'
    if columns:
        code += f'_scale_cols = {repr(columns)}\n'
    else:
        code += f'_scale_cols = {out}.select_dtypes(include=[np.number]).columns.tolist()\n'

    code += (
        f'_scaler = {cls_name}()\n'
        f'{out}[_scale_cols] = _scaler.fit_transform({out}[_scale_cols])\n'
    )

    return imports, code
