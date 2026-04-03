import json

import plotly.express as px


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    df = inputs["dataframe_in"]

    if df is None or df.empty:
        raise ValueError("Input DataFrame is empty.")

    numeric_df = df.select_dtypes(include="number")
    if numeric_df.shape[1] < 2:
        raise ValueError(
            "At least 2 numeric columns are required to compute a correlation matrix."
        )

    method = parameters.get("method", "pearson")
    valid_methods = ("pearson", "spearman", "kendall")
    if method not in valid_methods:
        raise ValueError(
            f"Invalid method '{method}'. Choose from: {', '.join(valid_methods)}."
        )

    corr = numeric_df.corr(method=method).round(3)

    fig = px.imshow(
        corr,
        text_auto=".2f",
        color_continuous_scale="RdBu_r",
        zmin=-1,
        zmax=1,
        title=f"Correlation Matrix ({method.capitalize()})",
        template="plotly_dark",
        aspect="auto",
    )

    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(t=60, b=60, l=80, r=20),
        coloraxis_colorbar=dict(title="r"),
    )

    fig.update_traces(
        hovertemplate="<b>%{x}</b> vs <b>%{y}</b><br>r = %{z:.3f}<extra></extra>"
    )

    return {
        "dataframe_out": df,
        "plot_out": json.loads(fig.to_json()),
    }
