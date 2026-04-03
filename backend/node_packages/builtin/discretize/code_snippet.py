"""Code snippet for Discretize node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    columns = params.get("columns", [])
    method = params.get("method", "equal_width")
    n_bins = params.get("n_bins", 5)
    custom_edges_str = params.get("custom_edges", "")
    labels_str = params.get("labels", "")

    imports = ["import pandas as pd"]

    code = f"{out} = {inp}.copy()\n"

    if columns:
        code += f"_bin_cols = {repr(columns)}\n"
    else:
        code += f'_bin_cols = {out}.select_dtypes(include=["number"]).columns.tolist()\n'

    # Parse labels
    if labels_str.strip():
        bin_labels = [lbl.strip() for lbl in labels_str.split(",") if lbl.strip()]
        labels_repr = repr(bin_labels)
    else:
        labels_repr = "None"

    if method == "custom":
        edges = [float(e.strip()) for e in custom_edges_str.split(",") if e.strip()]
        code += (
            f"for _col in _bin_cols:\n"
            f"    {out}[_col] = pd.cut("
            f"{out}[_col], bins={repr(edges)}, "
            f"labels={labels_repr}, include_lowest=True)\n"
        )
    elif method == "equal_width":
        code += (
            f"for _col in _bin_cols:\n"
            f"    {out}[_col] = pd.cut("
            f"{out}[_col], bins={n_bins}, "
            f"labels={labels_repr}, include_lowest=True)\n"
        )
    elif method == "equal_frequency":
        code += (
            f"for _col in _bin_cols:\n"
            f"    {out}[_col] = pd.qcut("
            f"{out}[_col], q={n_bins}, "
            f"labels={labels_repr}, duplicates='drop')\n"
        )

    return imports, code
