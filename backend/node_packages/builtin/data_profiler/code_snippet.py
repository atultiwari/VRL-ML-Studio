"""Code snippet for Data Info node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    imports = ["import pandas as pd"]
    code = (
        f'{out} = {inp}.copy()\n'
        f'print("=== Data Profile ===")\n'
        f'print(f"Shape: {{{out}.shape}}")\n'
        f'print(f"Dtypes:\\n{{{out}.dtypes}}")\n'
        f'print(f"Missing values:\\n{{{out}.isnull().sum()}}")\n'
        f'{out}.describe()\n'
    )
    return imports, code
