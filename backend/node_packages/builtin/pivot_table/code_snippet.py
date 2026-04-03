"""Code snippet for Pivot Table node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    index_col = params.get("index_col", "")
    columns_col = params.get("columns_col", "")
    values_col = params.get("values_col", "")
    aggfunc = params.get("aggfunc", "mean")
    fill_value = params.get("fill_value", None)
    margins = params.get("margins", False)

    imports = ["import pandas as pd"]

    args = [
        f"data={inp}",
        f"index={repr(index_col)}",
        f"columns={repr(columns_col)}",
        f"values={repr(values_col)}",
        f"aggfunc={repr(aggfunc)}",
    ]
    if fill_value is not None:
        args.append(f"fill_value={repr(fill_value)}")
    if margins:
        args.append("margins=True")

    code = f"{out} = pd.pivot_table({', '.join(args)})\n"
    code += f"{out} = {out}.reset_index()\n"
    code += f"{out}.columns = [str(c) for c in {out}.columns]\n"

    return imports, code
