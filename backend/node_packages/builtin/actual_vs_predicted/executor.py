"""Actual vs Predicted node — scatter of actual values vs model predictions."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
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

    y_pred = model.predict(X_test)

    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=y_test.values.tolist(),
            y=y_pred.tolist(),
            mode="markers",
            marker={"color": "#3b82f6", "opacity": 0.6, "size": 6},
            name="Predictions",
        )
    )

    # Perfect-prediction diagonal line (y = x)
    all_vals = list(y_test.values) + list(y_pred)
    line_min = min(all_vals)
    line_max = max(all_vals)

    fig.add_trace(
        go.Scatter(
            x=[line_min, line_max],
            y=[line_min, line_max],
            mode="lines",
            line={"color": "#6b7280", "dash": "dash", "width": 2},
            name="Perfect Prediction",
        )
    )

    fig.update_layout(
        title="Actual vs Predicted",
        xaxis_title="Actual Values",
        yaxis_title="Predicted Values",
        template="plotly_white",
    )

    return {"plot_out": fig.to_dict()}
