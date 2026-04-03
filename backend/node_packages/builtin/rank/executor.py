"""Rank node — rank features by importance relative to a target column."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import json

    import numpy as np
    import pandas as pd
    import plotly.graph_objects as go
    from sklearn.feature_selection import (
        chi2,
        f_classif,
        mutual_info_classif,
        mutual_info_regression,
    )

    df = inputs["dataframe_in"]

    if df is None or df.empty:
        raise ValueError("Input DataFrame is empty.")

    target_col = parameters.get("target_col")
    if not target_col:
        raise ValueError("target_col parameter is required. Select the target column.")

    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in DataFrame.")

    method = parameters.get("method", "mutual_info")
    top_n = parameters.get("top_n", 20)

    valid_methods = ("mutual_info", "anova_f", "chi2")
    if method not in valid_methods:
        raise ValueError(
            f"Invalid method '{method}'. Choose from: {', '.join(valid_methods)}."
        )

    numeric_df = df.select_dtypes(include="number").drop(
        columns=[target_col], errors="ignore"
    )
    if numeric_df.shape[1] == 0:
        raise ValueError("No numeric feature columns found for ranking.")

    y = df[target_col]
    X = numeric_df

    # Handle missing values for scoring
    X_clean = X.fillna(0)

    is_classification = y.dtype == "object" or y.nunique() <= 20

    if method == "mutual_info":
        if is_classification:
            scores = mutual_info_classif(X_clean, y, random_state=42)
        else:
            scores = mutual_info_regression(X_clean, y, random_state=42)
    elif method == "anova_f":
        scores, _ = f_classif(X_clean, y)
        scores = np.nan_to_num(scores, nan=0.0)
    elif method == "chi2":
        # chi2 requires non-negative values
        X_positive = X_clean - X_clean.min()
        scores, _ = chi2(X_positive, y)
        scores = np.nan_to_num(scores, nan=0.0)

    ranking = pd.DataFrame(
        {"feature": X.columns.tolist(), "score": scores}
    ).sort_values("score", ascending=False)

    ranking = ranking.head(top_n)

    method_labels = {
        "mutual_info": "Mutual Information",
        "anova_f": "ANOVA F-value",
        "chi2": "Chi-Squared Score",
    }

    fig = go.Figure(
        go.Bar(
            x=ranking["score"].values[::-1],
            y=ranking["feature"].values[::-1],
            orientation="h",
            marker_color="#3b82f6",
            hovertemplate="<b>%{y}</b><br>Score: %{x:.4f}<extra></extra>",
        )
    )

    fig.update_layout(
        title=f"Feature Ranking ({method_labels[method]})",
        xaxis_title="Score",
        yaxis_title="Feature",
        template="plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(t=60, b=60, l=140, r=20),
    )

    return {
        "dataframe_out": df,
        "plot_out": json.loads(fig.to_json()),
    }
