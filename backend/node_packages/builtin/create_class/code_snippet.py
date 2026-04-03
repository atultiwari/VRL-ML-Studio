"""Code snippet for Create Class node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    mode = params.get("mode", "designate")

    imports = ["import pandas as pd"]

    code = f"{out} = {inp}.copy()\n"

    if mode == "designate":
        target_col = params.get("target_col", "")
        code += (
            f'# Designate "{target_col}" as the target column (moved to last position)\n'
            f'_target = {out}.pop("{target_col}")\n'
            f'{out}["{target_col}"] = _target\n'
        )
    elif mode == "from_expression":
        expression = params.get("expression", "")
        new_col_name = params.get("new_col_name", "target")
        class_labels_raw = params.get("class_labels", "0,1")
        labels = [s.strip() for s in class_labels_raw.split(",")]
        code += (
            f'# Create target column from expression\n'
            f'_mask = {out}.eval("{expression}")\n'
            f'{out}["{new_col_name}"] = _mask.map({{False: "{labels[0]}", True: "{labels[1]}"}})\n'
        )

    return imports, code
