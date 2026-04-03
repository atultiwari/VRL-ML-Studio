def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    """Compute clustering quality metrics from a DataFrame with cluster labels.

    Returns silhouette score, Calinski-Harabasz index, Davies-Bouldin index,
    plus cluster and sample counts.
    """
    import math

    import numpy as np
    from sklearn.metrics import (
        calinski_harabasz_score,
        davies_bouldin_score,
        silhouette_score,
    )

    df = inputs["dataframe_in"]
    cluster_col = parameters.get("cluster_col", "cluster")

    if cluster_col not in df.columns:
        raise ValueError(
            f"Cluster column '{cluster_col}' not found in DataFrame. "
            f"Available columns: {list(df.columns)}"
        )

    labels = df[cluster_col].values
    feature_cols = [c for c in df.select_dtypes(include=[np.number]).columns if c != cluster_col]

    if not feature_cols:
        raise ValueError("No numeric feature columns found (excluding the cluster column).")

    features = df[feature_cols].values

    n_samples = len(labels)
    unique_labels = set(labels)
    n_noise = int(np.sum(labels == -1))
    non_noise_labels = unique_labels - {-1}
    n_clusters = len(non_noise_labels)

    can_compute = n_clusters >= 2 and (n_samples - n_noise) >= 2

    if can_compute:
        mask = labels != -1
        silhouette = float(silhouette_score(features[mask], labels[mask]))
        calinski_harabasz = float(calinski_harabasz_score(features[mask], labels[mask]))
        davies_bouldin = float(davies_bouldin_score(features[mask], labels[mask]))
    else:
        silhouette = float("nan")
        calinski_harabasz = float("nan")
        davies_bouldin = float("nan")

    return {
        "metrics_out": {
            "silhouette": silhouette,
            "calinski_harabasz": calinski_harabasz,
            "davies_bouldin": davies_bouldin,
            "n_clusters": n_clusters,
            "n_samples": n_samples,
            "n_noise": n_noise,
        }
    }
