"""Heat Map node — displays a general-purpose heatmap of numeric data (raw, z-scored, or pivot)."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import json

    import numpy as np
    import pandas as pd
    import plotly.graph_objects as go

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")
    if not isinstance(df, pd.DataFrame):
        raise ValueError("Input must be a pandas DataFrame.")

    mode = parameters.get("mode", "raw")
    columns = parameters.get("columns", [])
    colorscale = parameters.get("colorscale", "Viridis")
    show_values = parameters.get("show_values", True)

    if mode in ("raw", "zscore"):
        numeric_df = df.select_dtypes(include="number")

        if columns:
            missing = [c for c in columns if c not in numeric_df.columns]
            if missing:
                raise ValueError(f"Columns not found or not numeric: {missing}")
            numeric_df = numeric_df[columns]

        if numeric_df.shape[1] < 1:
            raise ValueError("At least 1 numeric column is required for the heatmap.")

        if mode == "zscore":
            means = numeric_df.mean()
            stds = numeric_df.std().replace(0, np.nan)
            numeric_df = (numeric_df - means) / stds
            title = "Heat Map (Z-Score Normalized)"
        else:
            title = "Heat Map (Raw Values)"

        z_values = numeric_df.values
        x_labels = numeric_df.columns.tolist()
        y_labels = [str(i) for i in numeric_df.index.tolist()]

        if len(y_labels) > 50:
            step = max(1, len(y_labels) // 50)
            y_labels_display = [y_labels[i] if i % step == 0 else "" for i in range(len(y_labels))]
        else:
            y_labels_display = y_labels

    elif mode == "pivot":
        pivot_index = parameters.get("pivot_index", "")
        pivot_columns = parameters.get("pivot_columns", "")
        pivot_values = parameters.get("pivot_values", "")
        pivot_aggfunc = parameters.get("pivot_aggfunc", "mean")

        if not pivot_index or not pivot_columns or not pivot_values:
            raise ValueError(
                "Pivot mode requires pivot_index, pivot_columns, and pivot_values."
            )

        for col_name in (pivot_index, pivot_columns, pivot_values):
            if col_name not in df.columns:
                raise ValueError(f"Column '{col_name}' not found in DataFrame.")

        pivot_df = pd.pivot_table(
            df,
            index=pivot_index,
            columns=pivot_columns,
            values=pivot_values,
            aggfunc=pivot_aggfunc,
        )

        z_values = pivot_df.values
        x_labels = [str(c) for c in pivot_df.columns.tolist()]
        y_labels_display = [str(i) for i in pivot_df.index.tolist()]
        title = f"Heat Map (Pivot: {pivot_aggfunc} of {pivot_values})"

    else:
        raise ValueError(f"Unknown mode: {mode}")

    text_template = "%{z:.2f}" if show_values else ""

    fig = go.Figure(
        data=go.Heatmap(
            z=z_values,
            x=x_labels,
            y=y_labels_display,
            colorscale=colorscale,
            texttemplate=text_template,
            hovertemplate="<b>%{x}</b> / <b>%{y}</b><br>Value: %{z:.3f}<extra></extra>",
        )
    )

    fig.update_layout(
        title=dict(text=title, font=dict(size=16)),
        template="plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(t=60, b=60, l=80, r=20),
        xaxis=dict(title=""),
        yaxis=dict(title="", autorange="reversed"),
    )

    return {
        "dataframe_out": df,
        "plot_out": json.loads(fig.to_json()),
    }
