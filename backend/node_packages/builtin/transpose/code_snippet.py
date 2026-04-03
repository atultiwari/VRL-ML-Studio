"""Code snippet for Transpose node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    header_column = params.get("header_column", "")
    reset_index = params.get("reset_index", True)

    imports = ["import pandas as pd"]

    code = f"{out} = {inp}.copy()\n"
    if header_column:
        code += f"{out} = {out}.set_index({repr(header_column)})\n"
    code += f"{out} = {out}.T\n"
    if reset_index:
        code += f"{out} = {out}.reset_index()\n"
    code += f"{out}.columns = [str(c) for c in {out}.columns]\n"

    return imports, code
