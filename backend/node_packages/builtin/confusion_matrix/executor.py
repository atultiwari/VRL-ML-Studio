"""Confusion Matrix node — renders an interactive heatmap of the confusion matrix."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import numpy as np
    from sklearn.metrics import confusion_matrix as sk_confusion_matrix
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

    normalize_param = parameters.get("normalize", "none")
    normalize_arg = None if normalize_param == "none" else normalize_param

    labels = sorted(y_test.unique())
    cm = sk_confusion_matrix(y_test, y_pred, labels=labels, normalize=normalize_arg)

    label_strings = [str(label) for label in labels]

    # Build annotation text
    if normalize_arg is not None:
        text_values = [[f"{val:.2f}" for val in row] for row in cm]
    else:
        text_values = [[str(int(val)) for val in row] for row in cm]

    fig = go.Figure(
        data=go.Heatmap(
            z=cm,
            x=label_strings,
            y=label_strings,
            colorscale="Blues",
            text=text_values,
            texttemplate="%{text}",
            textfont={"size": 14},
            hovertemplate="True: %{y}<br>Predicted: %{x}<br>Value: %{text}<extra></extra>",
        )
    )

    fig.update_layout(
        title="Confusion Matrix",
        xaxis_title="Predicted Label",
        yaxis_title="True Label",
        xaxis={"type": "category", "side": "bottom"},
        yaxis={"type": "category", "autorange": "reversed"},
        width=600,
        height=550,
        margin={"l": 80, "r": 40, "t": 60, "b": 80},
    )

    return {"plot_out": fig.to_dict()}
