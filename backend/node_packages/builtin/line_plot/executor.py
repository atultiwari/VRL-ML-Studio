"""Line Plot node — display trends and time series data as a line chart."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import json

    import plotly.graph_objects as go

    df = inputs["dataframe_in"]

    if df is None or df.empty:
        raise ValueError("Input DataFrame is empty.")

    x_col = parameters.get("x_col") or ""
    y_cols = parameters.get("y_cols") or []
    color_col = parameters.get("color_col") or None
    show_markers = parameters.get("show_markers", False)

    if not x_col:
        # Default to first column (often an index or time column)
        x_col = df.columns[0]

    if x_col not in df.columns:
        raise ValueError(f"X column '{x_col}' not found in DataFrame.")

    if not y_cols:
        # Default to first few numeric columns excluding x_col
        numeric_cols = df.select_dtypes(include="number").columns.tolist()
        y_cols = [c for c in numeric_cols if c != x_col][:3]

    if not y_cols:
        raise ValueError("No numeric columns available for the Y axis.")

    missing = [c for c in y_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Y columns not found in DataFrame: {', '.join(missing)}")

    if color_col and color_col not in df.columns:
        raise ValueError(f"Color column '{color_col}' not found in DataFrame.")

    mode = "lines+markers" if show_markers else "lines"

    colors = [
        "#a855f7", "#3b82f6", "#10b981", "#f97316",
        "#ec4899", "#6366f1", "#14b8a6", "#eab308",
    ]

    fig = go.Figure()

    if color_col and len(y_cols) == 1:
        # Group by color column with a single y column
        y_col = y_cols[0]
        groups = df[color_col].dropna().unique()
        for i, grp in enumerate(groups):
            subset = df[df[color_col] == grp].sort_values(x_col)
            fig.add_trace(
                go.Scatter(
                    x=subset[x_col],
                    y=subset[y_col],
                    mode=mode,
                    name=str(grp),
                    line=dict(color=colors[i % len(colors)]),
                    hovertemplate=(
                        f"<b>{x_col}</b>: %{{x}}<br>"
                        f"<b>{y_col}</b>: %{{y}}<extra>{grp}</extra>"
                    ),
                )
            )
    else:
        # One trace per y column
        sorted_df = df.sort_values(x_col)
        for i, y_col in enumerate(y_cols):
            fig.add_trace(
                go.Scatter(
                    x=sorted_df[x_col],
                    y=sorted_df[y_col],
                    mode=mode,
                    name=y_col,
                    line=dict(color=colors[i % len(colors)]),
                    hovertemplate=(
                        f"<b>{x_col}</b>: %{{x}}<br>"
                        f"<b>{y_col}</b>: %{{y}}<extra></extra>"
                    ),
                )
            )

    y_title = y_cols[0] if len(y_cols) == 1 else "Value"

    fig.update_layout(
        title=f"Line Chart: {', '.join(y_cols)} vs {x_col}",
        xaxis_title=x_col,
        yaxis_title=y_title,
        template="plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(t=60, b=60, l=60, r=20),
    )

    return {
        "dataframe_out": df,
        "plot_out": json.loads(fig.to_json()),
    }
