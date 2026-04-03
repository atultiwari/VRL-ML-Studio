"""Code snippet for Group By node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    group_columns = params.get("group_columns", [])
    aggregation = params.get("aggregation", "mean")
    value_columns = params.get("value_columns", [])

    imports = ["import pandas as pd"]

    if value_columns:
        code = (
            f"{out} = {inp}[{repr(group_columns + value_columns)}]"
            f".groupby({repr(group_columns)}, as_index=False)"
            f".agg({repr(aggregation)})\n"
        )
    else:
        code = (
            f"{out} = {inp}.groupby({repr(group_columns)}, as_index=False)"
            f".agg({repr(aggregation)})\n"
        )

    return imports, code
