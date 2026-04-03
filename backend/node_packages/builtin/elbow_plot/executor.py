def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    """Run K-Means for a range of k values and plot inertia (elbow method).

    Accepts the original DataFrame (before clustering) and produces a line
    chart of inertia vs. number of clusters.
    """
    import numpy as np
    import plotly.graph_objects as go
    from sklearn.cluster import KMeans

    df = inputs["dataframe_in"]
    k_min = parameters.get("k_min", 2)
    k_max = parameters.get("k_max", 10)
    random_state = parameters.get("random_state", 42)

    if k_min >= k_max:
        raise ValueError(
            f"k_min ({k_min}) must be less than k_max ({k_max})."
        )

    feature_cols = list(df.select_dtypes(include=[np.number]).columns)

    if not feature_cols:
        raise ValueError("No numeric columns found in the DataFrame.")

    features = df[feature_cols].values
    k_values = list(range(k_min, k_max + 1))
    inertias = []

    for k in k_values:
        kmeans = KMeans(n_clusters=k, random_state=random_state, n_init="auto")
        kmeans.fit(features)
        inertias.append(float(kmeans.inertia_))

    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=k_values,
            y=inertias,
            mode="lines+markers",
            marker=dict(size=8, color="#ef4444"),
            line=dict(color="#ef4444", width=2),
            name="Inertia",
        )
    )

    fig.update_layout(
        title="Elbow Method",
        xaxis_title="Number of Clusters (k)",
        yaxis_title="Inertia",
        template="plotly_white",
        xaxis=dict(dtick=1),
    )

    return {"plot_out": fig.to_dict()}
