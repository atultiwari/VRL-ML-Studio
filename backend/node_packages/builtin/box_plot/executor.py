import json

import plotly.express as px


_MAX_AUTO_COLUMNS = 10


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    df = inputs["dataframe_in"]

    if df is None or df.empty:
        raise ValueError("Input DataFrame is empty.")

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    if not numeric_cols:
        raise ValueError("No numeric columns found in the DataFrame.")

    columns: list = parameters.get("columns") or []

    if not columns:
        columns = numeric_cols[:_MAX_AUTO_COLUMNS]

    invalid = [c for c in columns if c not in df.columns]
    if invalid:
        raise ValueError(f"Columns not found in DataFrame: {', '.join(invalid)}")

    non_numeric = [c for c in columns if c not in numeric_cols]
    if non_numeric:
        raise ValueError(
            f"Non-numeric columns selected: {', '.join(non_numeric)}. "
            "Box plots require numeric columns."
        )

    melted = df[columns].melt(var_name="Column", value_name="Value")

    fig = px.box(
        melted,
        x="Column",
        y="Value",
        points="outliers",
        title="Box Plot",
        template="plotly_dark",
        color="Column",
        color_discrete_sequence=px.colors.qualitative.Vivid,
    )

    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(t=60, b=60, l=60, r=20),
        showlegend=False,
        xaxis_title="Column",
        yaxis_title="Value",
    )

    return {
        "dataframe_out": df,
        "plot_out": json.loads(fig.to_json()),
    }
