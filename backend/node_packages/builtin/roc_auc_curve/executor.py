"""ROC Analysis node — plots the ROC curve and computes AUC for binary and multiclass."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import numpy as np
    from sklearn.metrics import roc_curve, auc
    from sklearn.preprocessing import label_binarize
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
            "This model does not support predict_proba, which is required for ROC-AUC. "
            "Use a model that supports probability estimates (e.g., Logistic Regression, Random Forest)."
        )

    classes = sorted(y_test.unique())
    n_classes = len(classes)

    fig = go.Figure()
    metrics: dict = {}

    if n_classes == 2:
        # Binary classification
        y_score = model.predict_proba(X_test)[:, 1]
        fpr, tpr, _ = roc_curve(y_test, y_score, pos_label=classes[1])
        roc_auc = auc(fpr, tpr)

        fig.add_trace(
            go.Scatter(
                x=fpr.tolist(),
                y=tpr.tolist(),
                mode="lines",
                name=f"ROC (AUC = {roc_auc:.3f})",
                line={"color": "#3b82f6", "width": 2},
            )
        )
        metrics["auc"] = round(float(roc_auc), 4)
    else:
        # Multiclass — One-vs-Rest
        y_test_bin = label_binarize(y_test, classes=classes)
        y_score = model.predict_proba(X_test)

        colors = [
            "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
            "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
        ]

        for i, cls in enumerate(classes):
            fpr, tpr, _ = roc_curve(y_test_bin[:, i], y_score[:, i])
            roc_auc = auc(fpr, tpr)
            color = colors[i % len(colors)]

            fig.add_trace(
                go.Scatter(
                    x=fpr.tolist(),
                    y=tpr.tolist(),
                    mode="lines",
                    name=f"Class {cls} (AUC = {roc_auc:.3f})",
                    line={"color": color, "width": 2},
                )
            )
            metrics[f"auc_class_{cls}"] = round(float(roc_auc), 4)

        # Compute macro-average AUC
        all_auc_values = [v for k, v in metrics.items() if k.startswith("auc_class_")]
        metrics["auc_macro"] = round(float(np.mean(all_auc_values)), 4)

    # Diagonal reference line
    fig.add_trace(
        go.Scatter(
            x=[0, 1],
            y=[0, 1],
            mode="lines",
            name="Random (AUC = 0.500)",
            line={"color": "#9ca3af", "width": 1, "dash": "dash"},
            showlegend=True,
        )
    )

    fig.update_layout(
        title="ROC Curve",
        xaxis_title="False Positive Rate",
        yaxis_title="True Positive Rate",
        xaxis={"range": [0, 1], "constrain": "domain"},
        yaxis={"range": [0, 1.05], "scaleanchor": "x", "scaleratio": 1},
        width=650,
        height=550,
        margin={"l": 60, "r": 40, "t": 60, "b": 60},
        legend={"x": 0.55, "y": 0.05},
    )

    return {"plot_out": fig.to_dict(), "metrics_out": metrics}
