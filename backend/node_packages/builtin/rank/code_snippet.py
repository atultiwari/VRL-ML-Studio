"""Code snippet for Rank node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out_df = output_vars.get("dataframe_out", "df")
    out_fig = output_vars.get("plot_out", "fig")

    target_col = params.get("target_col", "target")
    method = params.get("method", "mutual_info")
    top_n = params.get("top_n", 20)

    method_map = {
        "mutual_info": ("mutual_info_classif", "mutual_info_classif"),
        "anova_f": ("f_classif", "f_classif"),
        "chi2": ("chi2", "chi2"),
    }
    func_import, func_name = method_map.get(method, method_map["mutual_info"])

    imports = [
        "import pandas as pd",
        "import numpy as np",
        f"from sklearn.feature_selection import {func_import}",
        "import plotly.graph_objects as go",
    ]

    if method == "mutual_info":
        score_line = (
            f'_scores = {func_name}('
            f'{inp}.select_dtypes(include="number")'
            f'.drop(columns=["{target_col}"], errors="ignore")'
            f'.fillna(0), {inp}["{target_col}"], random_state=42)'
        )
    elif method == "anova_f":
        score_line = (
            f'_scores, _ = {func_name}('
            f'{inp}.select_dtypes(include="number")'
            f'.drop(columns=["{target_col}"], errors="ignore")'
            f'.fillna(0), {inp}["{target_col}"])\n'
            f'_scores = np.nan_to_num(_scores, nan=0.0)'
        )
    else:
        score_line = (
            f'_X = {inp}.select_dtypes(include="number")'
            f'.drop(columns=["{target_col}"], errors="ignore").fillna(0)\n'
            f'_X = _X - _X.min()\n'
            f'_scores, _ = {func_name}(_X, {inp}["{target_col}"])\n'
            f'_scores = np.nan_to_num(_scores, nan=0.0)'
        )

    code = (
        f'{out_df} = {inp}.copy()\n'
        f'_features = {inp}.select_dtypes(include="number")'
        f'.drop(columns=["{target_col}"], errors="ignore").columns.tolist()\n'
        f'{score_line}\n'
        f'_ranking = pd.DataFrame({{"feature": _features, "score": _scores}})'
        f'.sort_values("score", ascending=False).head({top_n})\n'
        f'{out_fig} = go.Figure(go.Bar(\n'
        f'    x=_ranking["score"].values[::-1],\n'
        f'    y=_ranking["feature"].values[::-1],\n'
        f'    orientation="h"\n'
        f'))\n'
        f'{out_fig}.update_layout(title="Feature Ranking ({method})", '
        f'xaxis_title="Score", yaxis_title="Feature")\n'
        f'{out_fig}.show()\n'
    )
    return imports, code
