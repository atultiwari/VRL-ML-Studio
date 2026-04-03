"""Code snippet for Feature Selector node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    method = params.get("method", "manual")
    columns = params.get("columns", [])
    threshold = params.get("threshold", 0.0)

    imports = ["import pandas as pd"]

    if method == "manual" and columns:
        code = f'{out} = {inp}[{repr(columns)}].copy()\n'
    elif method == "variance":
        imports.append("from sklearn.feature_selection import VarianceThreshold")
        code = (
            f'_numeric = {inp}.select_dtypes(include="number")\n'
            f'_sel = VarianceThreshold(threshold={threshold})\n'
            f'_sel.fit(_numeric)\n'
            f'_keep = _numeric.columns[_sel.get_support()].tolist()\n'
            f'{out} = {inp}[_keep].copy()\n'
        )
    elif method == "correlation":
        code = (
            f'_corr = {inp}.select_dtypes(include="number").corr().abs()\n'
            f'_upper = _corr.where(np.triu(np.ones(_corr.shape), k=1).astype(bool))\n'
            f'_drop = [c for c in _upper.columns if any(_upper[c] > {threshold})]\n'
            f'{out} = {inp}.drop(columns=_drop).copy()\n'
        )
        imports.append("import numpy as np")
    else:
        code = f'{out} = {inp}.copy()\n'

    return imports, code
