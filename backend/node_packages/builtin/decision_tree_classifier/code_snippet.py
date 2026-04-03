"""Code snippet for Decision Tree Classifier node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    split = input_vars.get("split_data_in", "split")
    model_out = output_vars.get("model_out", "model")
    df_out = output_vars.get("dataframe_out", "df_test")

    max_depth = params.get("max_depth", None)
    min_samples_split = params.get("min_samples_split", 2)
    criterion = params.get("criterion", "gini")
    random_state = params.get("random_state", 42)

    imports = ["from sklearn.tree import DecisionTreeClassifier"]

    depth_arg = f"max_depth={max_depth}" if max_depth is not None else "max_depth=None"

    code = (
        f'X_train = {split}_train.drop(columns=[{split}_target_col])\n'
        f'y_train = {split}_train[{split}_target_col]\n'
        f'{df_out} = {split}_test\n'
        f'{model_out} = DecisionTreeClassifier({depth_arg}, min_samples_split={min_samples_split}, '
        f'criterion="{criterion}", random_state={random_state})\n'
        f'{model_out}.fit(X_train, y_train)\n'
    )
    return imports, code
