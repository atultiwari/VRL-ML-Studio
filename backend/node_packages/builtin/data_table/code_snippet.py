"""Code snippet for Data Table node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out_df = output_vars.get("dataframe_out", "df")

    imports = ["import pandas as pd"]

    code = (
        f'{out_df} = {inp}\n'
        f'print(f"Shape: {{{inp}.shape}}")\n'
        f'print(f"Memory: {{{inp}.memory_usage(deep=True).sum() / 1024:.1f}} KB")\n'
        f'print(f"Null count: {{{inp}.isnull().sum().sum()}}")\n'
        f'print(f"Duplicate rows: {{{inp}.duplicated().sum()}}")\n'
        f"print({inp}.dtypes.value_counts())\n"
        f"{inp}.head()\n"
    )

    return imports, code
