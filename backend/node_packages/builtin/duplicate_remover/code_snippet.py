"""Code snippet for Duplicate Remover node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    subset = params.get("subset_columns", [])

    imports = ["import pandas as pd"]

    if subset:
        code = f'{out} = {inp}.drop_duplicates(subset={repr(subset)}).reset_index(drop=True)\n'
    else:
        code = f'{out} = {inp}.drop_duplicates().reset_index(drop=True)\n'

    code += f'print(f"Removed {{len({inp}) - len({out})}} duplicates")\n'

    return imports, code
