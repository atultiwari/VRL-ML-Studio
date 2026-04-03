import json

import plotly.express as px


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    df = inputs["dataframe_in"]

    if df is None or df.empty:
        raise ValueError("Input DataFrame is empty.")

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    if len(numeric_cols) < 2:
        raise ValueError(
            "At least 2 numeric columns are required for a scatter plot."
        )

    x_col = parameters.get("x_col") or numeric_cols[0]
    y_col = parameters.get("y_col") or numeric_cols[1]
    color_col = parameters.get("color_col") or None

    if x_col not in df.columns:
        raise ValueError(f"X column '{x_col}' not found in DataFrame.")
    if y_col not in df.columns:
        raise ValueError(f"Y column '{y_col}' not found in DataFrame.")
    if color_col and color_col not in df.columns:
        raise ValueError(f"Color column '{color_col}' not found in DataFrame.")

    scatter_kwargs: dict = dict(
        data_frame=df,
        x=x_col,
        y=y_col,
        title=f"{y_col} vs {x_col}",
        template="plotly_dark",
        opacity=0.75,
    )

    if color_col:
        scatter_kwargs["color"] = color_col
    else:
        scatter_kwargs["color_discrete_sequence"] = ["#a855f7"]

    fig = px.scatter(**scatter_kwargs)

    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(t=60, b=60, l=60, r=20),
        xaxis_title=x_col,
        yaxis_title=y_col,
    )

    fig.update_traces(
        marker=dict(size=6),
        hovertemplate=(
            f"<b>{x_col}</b>: %{{x}}<br><b>{y_col}</b>: %{{y}}<extra></extra>"
        ),
    )

    return {
        "dataframe_out": df,
        "plot_out": json.loads(fig.to_json()),
    }
