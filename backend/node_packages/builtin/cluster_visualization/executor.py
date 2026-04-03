def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    """Create a 2D scatter plot of clustered data.

    Applies PCA to reduce to 2 dimensions when the feature space has more
    than 2 numeric columns.
    """
    import numpy as np
    import plotly.graph_objects as go
    from sklearn.decomposition import PCA

    df = inputs["dataframe_in"]
    cluster_col = parameters.get("cluster_col", "cluster")

    if cluster_col not in df.columns:
        raise ValueError(
            f"Cluster column '{cluster_col}' not found in DataFrame. "
            f"Available columns: {list(df.columns)}"
        )

    labels = df[cluster_col].values
    feature_cols = [
        c for c in df.select_dtypes(include=[np.number]).columns if c != cluster_col
    ]

    if len(feature_cols) < 2:
        raise ValueError(
            f"At least 2 numeric feature columns are required, found {len(feature_cols)}."
        )

    features = df[feature_cols].values
    used_pca = len(feature_cols) > 2

    if used_pca:
        pca = PCA(n_components=2, random_state=42)
        coords = pca.fit_transform(features)
        x_label = "PC1"
        y_label = "PC2"
        title = "Cluster Visualization (PCA)"
    else:
        coords = features[:, :2]
        x_label = feature_cols[0]
        y_label = feature_cols[1]
        title = "Cluster Visualization"

    unique_labels = sorted(set(labels))

    palette = [
        "#636EFA", "#EF553B", "#00CC96", "#AB63FA", "#FFA15A",
        "#19D3F3", "#FF6692", "#B6E880", "#FF97FF", "#FECB52",
    ]

    fig = go.Figure()

    for label in unique_labels:
        mask = labels == label

        if label == -1:
            fig.add_trace(
                go.Scatter(
                    x=coords[mask, 0].tolist(),
                    y=coords[mask, 1].tolist(),
                    mode="markers",
                    name="Noise",
                    marker=dict(color="#9ca3af", symbol="x", size=7),
                )
            )
        else:
            color_idx = int(label) % len(palette)
            fig.add_trace(
                go.Scatter(
                    x=coords[mask, 0].tolist(),
                    y=coords[mask, 1].tolist(),
                    mode="markers",
                    name=f"Cluster {label}",
                    marker=dict(color=palette[color_idx], size=7),
                )
            )

    fig.update_layout(
        title=title,
        xaxis_title=x_label,
        yaxis_title=y_label,
        template="plotly_white",
        legend_title="Cluster",
    )

    return {"plot_out": fig.to_dict()}
