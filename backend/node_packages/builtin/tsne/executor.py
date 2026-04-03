import json


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd
    import plotly.express as px
    from sklearn.manifold import TSNE

    df = inputs["dataframe_in"]

    if df is None or df.empty:
        raise ValueError("Input DataFrame is empty.")

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    if len(numeric_cols) < 2:
        raise ValueError("At least 2 numeric columns are required for t-SNE.")

    n_components = parameters.get("n_components", 2)
    perplexity = parameters.get("perplexity", 30.0)
    learning_rate = parameters.get("learning_rate", 200.0)
    random_state = parameters.get("random_state", 42)

    numeric_data = df[numeric_cols].dropna()

    # Perplexity must be less than the number of samples
    effective_perplexity = min(perplexity, max(5.0, len(numeric_data) - 1))

    tsne = TSNE(
        n_components=n_components,
        perplexity=effective_perplexity,
        learning_rate=learning_rate,
        random_state=random_state,
        init="pca",
    )
    transformed = tsne.fit_transform(numeric_data)

    # Build output DataFrame with tSNE columns
    tsne_columns = [f"tSNE{i + 1}" for i in range(n_components)]
    df_transformed = pd.DataFrame(
        transformed,
        columns=tsne_columns,
        index=numeric_data.index,
    )

    # Preserve non-numeric columns from the original DataFrame
    non_numeric_cols = df.select_dtypes(exclude="number").columns.tolist()
    for col in non_numeric_cols:
        df_transformed[col] = df.loc[numeric_data.index, col].values

    # Create 2D scatter of tSNE1 vs tSNE2
    fig = px.scatter(
        df_transformed,
        x="tSNE1",
        y="tSNE2",
        title=f"t-SNE (perplexity={effective_perplexity:.0f})",
        template="plotly_dark",
        opacity=0.75,
        color_discrete_sequence=["#f59e0b"],
    )

    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(t=60, b=60, l=60, r=20),
        xaxis_title="tSNE1",
        yaxis_title="tSNE2",
    )

    fig.update_traces(marker=dict(size=6))

    return {
        "dataframe_out": df_transformed,
        "plot_out": json.loads(fig.to_json()),
    }
