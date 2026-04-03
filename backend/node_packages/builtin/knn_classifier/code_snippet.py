"""Code snippet for KNN Classifier node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    split = input_vars.get("split_data_in", "split")
    model_out = output_vars.get("model_out", "model")
    df_out = output_vars.get("dataframe_out", "df_test")

    n_neighbors = params.get("n_neighbors", 5)
    weights = params.get("weights", "uniform")
    metric = params.get("metric", "minkowski")

    imports = ["from sklearn.neighbors import KNeighborsClassifier"]

    code = (
        f'X_train = {split}_train.drop(columns=[{split}_target_col])\n'
        f'y_train = {split}_train[{split}_target_col]\n'
        f'{df_out} = {split}_test\n'
        f'{model_out} = KNeighborsClassifier(n_neighbors={n_neighbors}, weights="{weights}", metric="{metric}")\n'
        f'{model_out}.fit(X_train, y_train)\n'
    )
    return imports, code
