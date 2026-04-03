"""Code snippet for Concatenate node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp_top = input_vars.get("dataframe_top", "df_first")
    inp_bottom = input_vars.get("dataframe_bottom", "df_second")
    out = output_vars.get("dataframe_out", "df_combined")

    axis_param = params.get("axis", "rows")
    ignore_index = params.get("ignore_index", True)
    add_source_column = params.get("add_source_column", False)

    imports = ["import pandas as pd"]

    axis = 0 if axis_param == "rows" else 1

    code = ""

    if add_source_column:
        code += f'{inp_top} = {inp_top}.copy()\n'
        code += f'{inp_top}["_source"] = "first"\n'
        code += f'{inp_bottom} = {inp_bottom}.copy()\n'
        code += f'{inp_bottom}["_source"] = "second"\n'

    code += (
        f"{out} = pd.concat("
        f"[{inp_top}, {inp_bottom}], "
        f"axis={axis}, "
        f"ignore_index={ignore_index})\n"
    )

    return imports, code
