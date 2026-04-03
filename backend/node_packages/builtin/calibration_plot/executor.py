"""Calibration Plot node — renders a reliability diagram with predicted probability histogram."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from sklearn.calibration import calibration_curve
    from sklearn.metrics import brier_score_loss
    import plotly.graph_objects as go
    from plotly.subplots import make_subplots
    import numpy as np

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
            "This model does not support predict_proba, which is required for "
            "calibration analysis. Use a model that supports probability estimates "
            "(e.g., Logistic Regression, Random Forest)."
        )

    classes = sorted(y_test.unique())
    if len(classes) != 2:
        raise ValueError(
            f"Calibration plot requires binary classification but found "
            f"{len(classes)} classes: {classes}. Reduce to two classes or use "
            "a different evaluation node."
        )

    y_prob = model.predict_proba(X_test)[:, 1]

    n_bins = parameters.get("n_bins", 10)
    strategy = parameters.get("strategy", "uniform")

    fraction_of_positives, mean_predicted_value = calibration_curve(
        y_test, y_prob, n_bins=n_bins, strategy=strategy,
    )

    brier = float(brier_score_loss(y_test, y_prob))

    # Build figure with secondary y-axis for histogram
    fig = make_subplots(specs=[[{"secondary_y": True}]])

    # Calibration curve
    fig.add_trace(
        go.Scatter(
            x=mean_predicted_value.tolist(),
            y=fraction_of_positives.tolist(),
            mode="lines+markers",
            name="Calibration Curve",
            line={"color": "#3b82f6", "width": 2},
            marker={"size": 6},
        ),
        secondary_y=False,
    )

    # Perfectly calibrated reference line
    fig.add_trace(
        go.Scatter(
            x=[0, 1],
            y=[0, 1],
            mode="lines",
            name="Perfectly Calibrated",
            line={"color": "#9ca3af", "width": 1, "dash": "dash"},
            showlegend=True,
        ),
        secondary_y=False,
    )

    # Histogram of predicted probabilities
    fig.add_trace(
        go.Histogram(
            x=y_prob.tolist(),
            nbinsx=n_bins,
            name="Prediction Distribution",
            marker_color="rgba(249, 115, 22, 0.35)",
            showlegend=True,
        ),
        secondary_y=True,
    )

    fig.update_layout(
        title=f"Calibration Plot (Brier Score = {brier:.4f})",
        xaxis_title="Mean Predicted Probability",
        width=700,
        height=550,
        margin={"l": 60, "r": 60, "t": 60, "b": 60},
        legend={"x": 0.02, "y": 0.98},
        barmode="overlay",
    )
    fig.update_yaxes(title_text="Fraction of Positives", secondary_y=False)
    fig.update_yaxes(title_text="Count", secondary_y=True)

    # Determine calibration quality label
    if brier < 0.1:
        quality = "good"
    elif brier < 0.25:
        quality = "fair"
    else:
        quality = "poor"

    metrics: dict = {
        "brier_score": round(brier, 4),
        "calibration": quality,
    }

    return {"plot_out": fig.to_dict(), "metrics_out": metrics}
