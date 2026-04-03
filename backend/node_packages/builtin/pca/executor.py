import json


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd
    import plotly.express as px
    from sklearn.decomposition import PCA

    df = inputs["dataframe_in"]

    if df is None or df.empty:
        raise ValueError("Input DataFrame is empty.")

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    if len(numeric_cols) < 2:
        raise ValueError("At least 2 numeric columns are required for PCA.")

    n_components = parameters.get("n_components", 2)
    svd_solver = parameters.get("svd_solver", "auto")

    # Cap n_components to available features
    n_components = min(n_components, len(numeric_cols))

    numeric_data = df[numeric_cols].dropna()

    pca = PCA(n_components=n_components, svd_solver=svd_solver)
    transformed = pca.fit_transform(numeric_data)

    # Build output DataFrame with PC columns
    pc_columns = [f"PC{i + 1}" for i in range(n_components)]
    df_transformed = pd.DataFrame(
        transformed,
        columns=pc_columns,
        index=numeric_data.index,
    )

    # Preserve non-numeric columns from the original DataFrame
    non_numeric_cols = df.select_dtypes(exclude="number").columns.tolist()
    for col in non_numeric_cols:
        df_transformed[col] = df.loc[numeric_data.index, col].values

    # Create 2D scatter if at least 2 components
    if n_components >= 2:
        var_ratios = pca.explained_variance_ratio_
        x_label = f"PC1 ({var_ratios[0]:.1%})"
        y_label = f"PC2 ({var_ratios[1]:.1%})"

        total_var = sum(var_ratios) * 100

        fig = px.scatter(
            df_transformed,
            x="PC1",
            y="PC2",
            title=f"PCA — {total_var:.1f}% total variance explained",
            template="plotly_dark",
            opacity=0.75,
            color_discrete_sequence=["#10b981"],
        )

        fig.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            margin=dict(t=60, b=60, l=60, r=20),
            xaxis_title=x_label,
            yaxis_title=y_label,
        )

        fig.update_traces(marker=dict(size=6))
    else:
        # Single component — show a histogram of PC1
        var_ratio = pca.explained_variance_ratio_[0]
        fig = px.histogram(
            df_transformed,
            x="PC1",
            title=f"PC1 Distribution ({var_ratio:.1%} variance explained)",
            template="plotly_dark",
            color_discrete_sequence=["#10b981"],
        )

        fig.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            margin=dict(t=60, b=60, l=60, r=20),
        )

    return {
        "dataframe_out": df_transformed,
        "plot_out": json.loads(fig.to_json()),
    }
