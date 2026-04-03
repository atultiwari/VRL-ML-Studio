"""Bar Plot node — display categorical data as a bar chart with counts or aggregated values."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import json

    import plotly.graph_objects as go

    df = inputs["dataframe_in"]

    if df is None or df.empty:
        raise ValueError("Input DataFrame is empty.")

    x_col = parameters.get("x_col") or ""
    y_col = parameters.get("y_col") or ""
    aggregation = parameters.get("aggregation", "count")
    color_col = parameters.get("color_col") or None
    orientation = parameters.get("orientation", "vertical")

    if not x_col:
        # Default to first non-numeric column, or first column
        non_numeric = df.select_dtypes(exclude="number").columns.tolist()
        if non_numeric:
            x_col = non_numeric[0]
        else:
            x_col = df.columns[0]

    if x_col not in df.columns:
        raise ValueError(f"X column '{x_col}' not found in DataFrame.")
    if y_col and y_col not in df.columns:
        raise ValueError(f"Y column '{y_col}' not found in DataFrame.")
    if color_col and color_col not in df.columns:
        raise ValueError(f"Color column '{color_col}' not found in DataFrame.")

    is_horizontal = orientation == "horizontal"

    if not y_col or aggregation == "count":
        # Count mode
        if color_col:
            grouped = df.groupby([x_col, color_col]).size().reset_index(name="count")
        else:
            grouped = df[x_col].value_counts().reset_index()
            grouped.columns = [x_col, "count"]
        value_col = "count"
        axis_label = "Count"
    else:
        # Aggregation mode
        agg_map = {"mean": "mean", "sum": "sum", "median": "median"}
        agg_func = agg_map.get(aggregation, "mean")
        if color_col:
            grouped = (
                df.groupby([x_col, color_col])[y_col]
                .agg(agg_func)
                .reset_index()
            )
        else:
            grouped = (
                df.groupby(x_col)[y_col].agg(agg_func).reset_index()
            )
        value_col = y_col
        axis_label = f"{y_col} ({aggregation})"

    fig = go.Figure()

    colors = [
        "#a855f7", "#3b82f6", "#10b981", "#f97316",
        "#ec4899", "#6366f1", "#14b8a6", "#eab308",
    ]

    if color_col:
        color_groups = grouped[color_col].unique()
        for i, grp in enumerate(color_groups):
            subset = grouped[grouped[color_col] == grp]
            bar_kwargs = dict(
                name=str(grp),
                marker_color=colors[i % len(colors)],
            )
            if is_horizontal:
                bar_kwargs["x"] = subset[value_col]
                bar_kwargs["y"] = subset[x_col].astype(str)
                bar_kwargs["orientation"] = "h"
            else:
                bar_kwargs["x"] = subset[x_col].astype(str)
                bar_kwargs["y"] = subset[value_col]
            fig.add_trace(go.Bar(**bar_kwargs))
    else:
        bar_kwargs = dict(
            marker_color="#a855f7",
        )
        if is_horizontal:
            bar_kwargs["x"] = grouped[value_col]
            bar_kwargs["y"] = grouped[x_col].astype(str)
            bar_kwargs["orientation"] = "h"
            bar_kwargs["hovertemplate"] = (
                f"<b>%{{y}}</b><br>{axis_label}: %{{x}}<extra></extra>"
            )
        else:
            bar_kwargs["x"] = grouped[x_col].astype(str)
            bar_kwargs["y"] = grouped[value_col]
            bar_kwargs["hovertemplate"] = (
                f"<b>%{{x}}</b><br>{axis_label}: %{{y}}<extra></extra>"
            )
        fig.add_trace(go.Bar(**bar_kwargs))

    title = f"Bar Chart: {x_col}"
    if y_col and aggregation != "count":
        title += f" vs {y_col} ({aggregation})"

    layout_kwargs = dict(
        title=title,
        template="plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(t=60, b=60, l=80, r=20),
        barmode="group",
    )

    if is_horizontal:
        layout_kwargs["xaxis_title"] = axis_label
        layout_kwargs["yaxis_title"] = x_col
    else:
        layout_kwargs["xaxis_title"] = x_col
        layout_kwargs["yaxis_title"] = axis_label

    fig.update_layout(**layout_kwargs)

    return {
        "dataframe_out": df,
        "plot_out": json.loads(fig.to_json()),
    }
