"""Precision-Recall Curve node — plots precision vs recall for binary and multiclass."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from sklearn.metrics import precision_recall_curve as sk_pr_curve
    from sklearn.metrics import average_precision_score
    from sklearn.preprocessing import label_binarize
    import numpy as np
    import plotly.graph_objects as go

    model = inputs["model_in"]
    df = inputs["dataframe_in"]

    target_col = parameters.get("target_col")
    if not target_col:
        raise ValueError("target_col parameter is required. Select the target column.")

    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in DataFrame.")

    X_test = df.drop(columns=[target_col])
    y_test = df[target_col]

    if not hasattr(model, "predict_proba"):
        raise ValueError(
            "This model does not support predict_proba, which is required for the "
            "Precision-Recall curve. Use a model that supports probability estimates."
        )

    classes = sorted(y_test.unique())
    n_classes = len(classes)

    fig = go.Figure()

    colors = [
        "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
        "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
    ]

    if n_classes == 2:
        # Binary classification
        y_score = model.predict_proba(X_test)[:, 1]
        precision, recall, _ = sk_pr_curve(y_test, y_score, pos_label=classes[1])
        ap = average_precision_score(y_test, y_score, pos_label=classes[1])

        fig.add_trace(
            go.Scatter(
                x=recall.tolist(),
                y=precision.tolist(),
                mode="lines",
                name=f"PR Curve (AP = {ap:.3f})",
                line={"color": "#3b82f6", "width": 2},
                fill="tozeroy",
                fillcolor="rgba(59, 130, 246, 0.1)",
            )
        )
    else:
        # Multiclass — One-vs-Rest
        y_test_bin = label_binarize(y_test, classes=classes)
        y_score = model.predict_proba(X_test)

        for i, cls in enumerate(classes):
            precision, recall, _ = sk_pr_curve(y_test_bin[:, i], y_score[:, i])
            ap = average_precision_score(y_test_bin[:, i], y_score[:, i])
            color = colors[i % len(colors)]

            fig.add_trace(
                go.Scatter(
                    x=recall.tolist(),
                    y=precision.tolist(),
                    mode="lines",
                    name=f"Class {cls} (AP = {ap:.3f})",
                    line={"color": color, "width": 2},
                )
            )

    fig.update_layout(
        title="Precision-Recall Curve",
        xaxis_title="Recall",
        yaxis_title="Precision",
        xaxis={"range": [0, 1]},
        yaxis={"range": [0, 1.05]},
        width=650,
        height=550,
        margin={"l": 60, "r": 40, "t": 60, "b": 60},
        legend={"x": 0.05, "y": 0.05},
    )

    return {"plot_out": fig.to_dict()}
