import json

import plotly.graph_objects as go


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    df = inputs["dataframe_in"]

    if df is None or df.empty:
        raise ValueError("Input DataFrame is empty.")

    null_pct = (df.isnull().sum() / len(df) * 100).round(2)

    bar_colors = [
        "#ef4444" if v > 20 else "#f59e0b" if v > 5 else "#a855f7"
        for v in null_pct.values
    ]

    fig = go.Figure(
        data=[
            go.Bar(
                x=null_pct.index.tolist(),
                y=null_pct.values.tolist(),
                marker_color=bar_colors,
                text=[f"{v:.1f}%" for v in null_pct.values],
                textposition="outside",
                hovertemplate="<b>%{x}</b><br>Null: %{y:.1f}%<extra></extra>",
            )
        ]
    )

    fig.update_layout(
        title=dict(text="Null Percentage per Column", font=dict(size=16)),
        xaxis=dict(title="Column", tickangle=-35),
        yaxis=dict(title="Null %", range=[0, max(null_pct.max() * 1.2, 10)]),
        template="plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(t=60, b=80, l=60, r=20),
        showlegend=False,
    )

    return {
        "dataframe_out": df,
        "plot_out": json.loads(fig.to_json()),
    }
