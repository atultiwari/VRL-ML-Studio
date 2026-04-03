"""Violin Plot node — display distributions as violin plots with density, median, and quartiles."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import json

    import plotly.graph_objects as go

    df = inputs["dataframe_in"]

    if df is None or df.empty:
        raise ValueError("Input DataFrame is empty.")

    columns = parameters.get("columns") or []
    group_by = parameters.get("group_by") or None
    show_box = parameters.get("show_box", True)
    show_points = parameters.get("show_points", False)

    numeric_cols = df.select_dtypes(include="number").columns.tolist()

    if not columns:
        columns = numeric_cols[:5]
    else:
        missing = [c for c in columns if c not in df.columns]
        if missing:
            raise ValueError(f"Columns not found in DataFrame: {', '.join(missing)}")

    if not columns:
        raise ValueError("No numeric columns available for violin plot.")

    if group_by and group_by not in df.columns:
        raise ValueError(f"Group-by column '{group_by}' not found in DataFrame.")

    box_visible = show_box
    points_mode = "all" if show_points else False

    fig = go.Figure()

    if group_by:
        groups = df[group_by].dropna().unique()
        colors = [
            "#a855f7", "#3b82f6", "#10b981", "#f97316",
            "#ec4899", "#6366f1", "#14b8a6", "#eab308",
        ]
        for col in columns:
            for i, grp in enumerate(groups):
                subset = df[df[group_by] == grp]
                fig.add_trace(
                    go.Violin(
                        y=subset[col].dropna(),
                        name=f"{col} ({grp})",
                        legendgroup=str(grp),
                        scalegroup=col,
                        box_visible=box_visible,
                        points=points_mode,
                        line_color=colors[i % len(colors)],
                        hovertemplate=(
                            f"<b>{col}</b> ({grp})<br>"
                            "Value: %{y}<extra></extra>"
                        ),
                    )
                )
    else:
        colors = [
            "#a855f7", "#3b82f6", "#10b981", "#f97316",
            "#ec4899", "#6366f1", "#14b8a6", "#eab308",
        ]
        for i, col in enumerate(columns):
            fig.add_trace(
                go.Violin(
                    y=df[col].dropna(),
                    name=col,
                    box_visible=box_visible,
                    points=points_mode,
                    line_color=colors[i % len(colors)],
                    hovertemplate=(
                        f"<b>{col}</b><br>"
                        "Value: %{y}<extra></extra>"
                    ),
                )
            )

    title = "Violin Plot"
    if group_by:
        title += f" (grouped by {group_by})"

    fig.update_layout(
        title=title,
        yaxis_title="Value",
        template="plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(t=60, b=60, l=60, r=20),
    )

    return {
        "dataframe_out": df,
        "plot_out": json.loads(fig.to_json()),
    }
