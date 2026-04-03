import json

import plotly.express as px


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    df = inputs["dataframe_in"]

    if df is None or df.empty:
        raise ValueError("Input DataFrame is empty.")

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    if not numeric_cols:
        raise ValueError("No numeric columns found in the DataFrame.")

    column = parameters.get("column") or numeric_cols[0]
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found in DataFrame.")
    if column not in numeric_cols:
        raise ValueError(f"Column '{column}' is not numeric.")

    bins = int(parameters.get("bins", 20))
    kde = bool(parameters.get("kde", True))

    marginal = "rug" if kde else None

    fig = px.histogram(
        df,
        x=column,
        nbins=bins,
        marginal=marginal,
        title=f"Distribution of {column}",
        template="plotly_dark",
        color_discrete_sequence=["#a855f7"],
        opacity=0.85,
    )

    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis_title=column,
        yaxis_title="Count",
        margin=dict(t=60, b=60, l=60, r=20),
    )

    return {
        "dataframe_out": df,
        "plot_out": json.loads(fig.to_json()),
    }
