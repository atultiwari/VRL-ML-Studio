"""Residual Plot node — scatter of residuals vs predicted values."""


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
    residuals = y_test.values - y_pred

    fig = go.Figure()

    fig.add_trace(
        go.Scatter(
            x=y_pred.tolist(),
            y=residuals.tolist(),
            mode="markers",
            marker={"color": "#ef4444", "opacity": 0.6, "size": 6},
            name="Residuals",
        )
    )

    fig.add_hline(
        y=0,
        line_dash="dash",
        line_color="#6b7280",
        annotation_text="Zero",
        annotation_position="bottom right",
    )

    fig.update_layout(
        title="Residual Plot",
        xaxis_title="Predicted Values",
        yaxis_title="Residuals",
        template="plotly_white",
    )

    return {"plot_out": fig.to_dict()}
