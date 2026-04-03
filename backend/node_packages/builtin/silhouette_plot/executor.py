"""Silhouette Plot node — visualize per-sample silhouette coefficients grouped by cluster."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from sklearn.metrics import silhouette_samples, silhouette_score
    import plotly.graph_objects as go
    import numpy as np

    df = inputs["dataframe_in"]
    cluster_col = parameters.get("cluster_col", "cluster")

    if cluster_col not in df.columns:
        raise ValueError(
            f"Cluster column '{cluster_col}' not found in DataFrame. "
            f"Available columns: {list(df.columns)}"
        )

    labels = df[cluster_col].values

    # Determine feature columns
    feature_cols = parameters.get("feature_cols", [])
    if not feature_cols:
        feature_cols = [
            c for c in df.select_dtypes(include=[np.number]).columns
            if c != cluster_col
        ]

    if not feature_cols:
        raise ValueError(
            "No numeric feature columns found (excluding the cluster column)."
        )

    features = df[feature_cols].values
    metric = parameters.get("metric", "euclidean")

    unique_labels = sorted(set(labels))
    n_clusters = len(unique_labels)

    if n_clusters < 2:
        raise ValueError(
            f"Silhouette analysis requires at least 2 clusters but found {n_clusters}."
        )

    sample_silhouette_values = silhouette_samples(features, labels, metric=metric)
    overall_score = float(silhouette_score(features, labels, metric=metric))

    # Build the classic silhouette plot
    colors = [
        "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
        "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
    ]

    fig = go.Figure()
    y_lower = 0
    per_cluster_avg: dict = {}
    n_negative = 0

    for i, cluster_label in enumerate(unique_labels):
        cluster_mask = labels == cluster_label
        cluster_values = sample_silhouette_values[cluster_mask]
        cluster_values_sorted = np.sort(cluster_values)

        cluster_size = len(cluster_values_sorted)
        y_upper = y_lower + cluster_size

        color = colors[i % len(colors)]
        y_positions = list(range(y_lower, y_upper))

        per_cluster_avg[str(cluster_label)] = round(float(np.mean(cluster_values)), 4)
        n_negative += int(np.sum(cluster_values < 0))

        fig.add_trace(
            go.Bar(
                x=cluster_values_sorted.tolist(),
                y=y_positions,
                orientation="h",
                name=f"Cluster {cluster_label}",
                marker_color=color,
                showlegend=True,
                hovertemplate=(
                    "Cluster: %{customdata}<br>"
                    "Silhouette: %{x:.3f}<extra></extra>"
                ),
                customdata=[cluster_label] * cluster_size,
            )
        )

        y_lower = y_upper + 2  # gap between clusters

    # Vertical dashed line at the mean silhouette score
    fig.add_vline(
        x=overall_score,
        line_dash="dash",
        line_color="#9ca3af",
        line_width=2,
        annotation_text=f"Mean: {overall_score:.3f}",
        annotation_position="top right",
    )

    fig.update_layout(
        title=f"Silhouette Plot (Mean = {overall_score:.3f})",
        xaxis_title="Silhouette Coefficient",
        yaxis_title="Sample Index (grouped by cluster)",
        xaxis={"range": [-0.2, 1.0]},
        yaxis={"showticklabels": False},
        bargap=0,
        width=750,
        height=max(450, 10 * y_lower),
        margin={"l": 60, "r": 40, "t": 60, "b": 60},
    )

    metrics: dict = {
        "silhouette_score": round(overall_score, 4),
        "per_cluster_avg": per_cluster_avg,
        "n_negative_samples": n_negative,
        "n_clusters": n_clusters,
        "n_samples": len(labels),
    }

    return {"plot_out": fig.to_dict(), "metrics_out": metrics}
