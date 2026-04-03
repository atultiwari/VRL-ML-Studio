"""Louvain Clustering node — graph-based community detection via spectral clustering on a kNN graph."""

import json


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import numpy as np
    import pandas as pd
    import plotly.express as px
    from sklearn.cluster import SpectralClustering
    from sklearn.decomposition import PCA

    df = inputs["dataframe_in"]

    if df is None or df.empty:
        raise ValueError("Input DataFrame is empty.")

    columns = parameters.get("columns", [])
    if columns:
        numeric_cols = [c for c in columns if c in df.columns]
        if not numeric_cols:
            raise ValueError("None of the selected columns exist in the DataFrame.")
    else:
        numeric_cols = df.select_dtypes(include="number").columns.tolist()

    if len(numeric_cols) < 2:
        raise ValueError("At least 2 numeric columns are required for clustering.")

    n_clusters = parameters.get("n_clusters", 3)
    n_neighbors = parameters.get("n_neighbors", 10)
    random_state = parameters.get("random_state", 42)

    numeric_data = df[numeric_cols].dropna()

    model = SpectralClustering(
        n_clusters=n_clusters,
        affinity="nearest_neighbors",
        n_neighbors=n_neighbors,
        random_state=random_state,
        assign_labels="kmeans",
    )
    labels = model.fit_predict(numeric_data)

    df_result = df.copy()
    df_result.loc[numeric_data.index, "cluster"] = labels
    df_result["cluster"] = df_result["cluster"].astype("Int64").astype(str)

    # Build 2D scatter — use PCA when more than 2 numeric features
    if len(numeric_cols) > 2:
        pca = PCA(n_components=2, random_state=random_state)
        coords = pca.fit_transform(numeric_data)
        plot_df = pd.DataFrame(
            {"PC1": coords[:, 0], "PC2": coords[:, 1]},
            index=numeric_data.index,
        )
        x_label = f"PC1 ({pca.explained_variance_ratio_[0]:.1%})"
        y_label = f"PC2 ({pca.explained_variance_ratio_[1]:.1%})"
    else:
        plot_df = numeric_data[[numeric_cols[0], numeric_cols[1]]].copy()
        plot_df.columns = [numeric_cols[0], numeric_cols[1]]
        x_label = numeric_cols[0]
        y_label = numeric_cols[1]

    plot_df["cluster"] = labels.astype(str)

    fig = px.scatter(
        plot_df,
        x=plot_df.columns[0],
        y=plot_df.columns[1],
        color="cluster",
        title=f"Louvain Clustering (k={n_clusters}, neighbors={n_neighbors})",
        template="plotly_dark",
        opacity=0.75,
    )

    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(t=60, b=60, l=60, r=20),
        xaxis_title=x_label,
        yaxis_title=y_label,
    )

    fig.update_traces(marker=dict(size=6))

    return {
        "dataframe_out": df_result,
        "plot_out": json.loads(fig.to_json()),
    }
