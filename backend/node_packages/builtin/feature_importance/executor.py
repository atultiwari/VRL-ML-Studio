"""Feature Importance node — horizontal bar chart of feature importance scores."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import numpy as np
    import plotly.graph_objects as go

    model = inputs["model_in"]
    df = inputs["dataframe_in"]

    target_col = parameters.get("target_col")
    if not target_col:
        raise ValueError("target_col parameter is required. Select the target column.")

    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in DataFrame.")

    if not hasattr(model, "feature_importances_"):
        raise ValueError(
            "Feature importance is not available for this model type. "
            "Use a tree-based model (Decision Tree, Random Forest, XGBoost, Gradient Boosting)."
        )

    top_n = int(parameters.get("top_n", 20))

    feature_names = [col for col in df.columns if col != target_col]
    importances = np.array(model.feature_importances_)

    # Guard against length mismatch (e.g. after encoding expanded feature count)
    if len(importances) != len(feature_names):
        feature_names = [f"Feature {i}" for i in range(len(importances))]

    # Sort by importance descending, take top_n
    sorted_indices = np.argsort(importances)[::-1][:top_n]
    # Reverse for horizontal bar (highest at top)
    sorted_indices = sorted_indices[::-1]

    top_names = [feature_names[i] for i in sorted_indices]
    top_values = importances[sorted_indices].tolist()

    # Color gradient from light to dark based on importance
    max_val = max(top_values) if top_values else 1.0
    bar_colors = [
        f"rgba(245, 158, 11, {0.3 + 0.7 * (v / max_val)})" for v in top_values
    ]

    fig = go.Figure(
        data=go.Bar(
            x=top_values,
            y=top_names,
            orientation="h",
            marker={"color": bar_colors, "line": {"color": "#f59e0b", "width": 1}},
            hovertemplate="%{y}: %{x:.4f}<extra></extra>",
        )
    )

    fig.update_layout(
        title=f"Top {min(top_n, len(top_names))} Feature Importances",
        xaxis_title="Importance",
        yaxis_title="Feature",
        width=700,
        height=max(400, min(top_n, len(top_names)) * 25 + 120),
        margin={"l": 160, "r": 40, "t": 60, "b": 60},
    )

    return {"plot_out": fig.to_dict()}
