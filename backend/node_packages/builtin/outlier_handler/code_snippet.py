"""Code snippet for Outliers node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    method = params.get("method", "iqr")
    action = params.get("action", "remove")
    threshold = params.get("threshold", 1.5)

    imports = ["import numpy as np", "import pandas as pd"]

    code = f'{out} = {inp}.copy()\n'
    code += f'_num_cols = {out}.select_dtypes(include=[np.number]).columns\n'

    if method == "iqr":
        code += (
            f'for _col in _num_cols:\n'
            f'    _q1 = {out}[_col].quantile(0.25)\n'
            f'    _q3 = {out}[_col].quantile(0.75)\n'
            f'    _iqr = _q3 - _q1\n'
            f'    _lower, _upper = _q1 - {threshold} * _iqr, _q3 + {threshold} * _iqr\n'
        )
    else:  # zscore
        code += (
            f'for _col in _num_cols:\n'
            f'    _mean, _std = {out}[_col].mean(), {out}[_col].std()\n'
            f'    _lower = _mean - {threshold} * _std\n'
            f'    _upper = _mean + {threshold} * _std\n'
        )

    if action == "remove":
        code += f'    {out} = {out}[({out}[_col] >= _lower) & ({out}[_col] <= _upper)]\n'
    elif action == "cap":
        code += f'    {out}[_col] = {out}[_col].clip(_lower, _upper)\n'
    else:  # flag
        code += f'    {out}[f"{{_col}}_outlier"] = ({out}[_col] < _lower) | ({out}[_col] > _upper)\n'

    return imports, code
