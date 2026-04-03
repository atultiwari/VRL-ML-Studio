"""Code snippet for Impute node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    strategy = params.get("strategy", "mean")
    fill_value = params.get("fill_value", "")
    columns = params.get("columns", [])

    imports = [
        "import numpy as np",
        "import pandas as pd",
        "from sklearn.impute import SimpleImputer",
    ]

    code = f'{out} = {inp}.copy()\n'

    if columns:
        code += f'_impute_cols = {repr(columns)}\n'
    else:
        if strategy in ("mean", "median"):
            code += f'_impute_cols = {out}.select_dtypes(include=[np.number]).columns.tolist()\n'
        else:
            code += f'_impute_cols = {out}.columns.tolist()\n'

    imputer_args = f'strategy="{strategy}"'
    if strategy == "constant":
        fv = fill_value if fill_value else "missing"
        imputer_args += f', fill_value="{fv}"'

    code += (
        f'_imputer = SimpleImputer({imputer_args})\n'
        f'{out}[_impute_cols] = _imputer.fit_transform({out}[_impute_cols])\n'
    )

    return imports, code
