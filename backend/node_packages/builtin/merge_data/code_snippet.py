"""Code snippet for Merge Data node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp_left = input_vars.get("dataframe_left", "df_left")
    inp_right = input_vars.get("dataframe_right", "df_right")
    out = output_vars.get("dataframe_out", "df_merged")

    on_columns_str = params.get("on_columns", "")
    how = params.get("how", "inner")
    suffixes_left = params.get("suffixes_left", "_left")
    suffixes_right = params.get("suffixes_right", "_right")

    imports = ["import pandas as pd"]

    if on_columns_str.strip():
        on_columns = [c.strip() for c in on_columns_str.split(",") if c.strip()]
        on_repr = repr(on_columns)
    else:
        on_repr = f"list(set({inp_left}.columns) & set({inp_right}.columns))"

    code = (
        f"{out} = pd.merge(\n"
        f"    {inp_left},\n"
        f"    {inp_right},\n"
        f"    on={on_repr},\n"
        f"    how={repr(how)},\n"
        f"    suffixes=({repr(suffixes_left)}, {repr(suffixes_right)}),\n"
        f")\n"
    )

    return imports, code
