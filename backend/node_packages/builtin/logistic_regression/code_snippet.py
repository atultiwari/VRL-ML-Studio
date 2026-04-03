"""Code snippet for Logistic Regression node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    split = input_vars.get("split_data_in", "split")
    model_out = output_vars.get("model_out", "model")
    df_out = output_vars.get("dataframe_out", "df_test")

    C = params.get("C", 1.0)
    solver = params.get("solver", "lbfgs")
    max_iter = params.get("max_iter", 100)
    random_state = params.get("random_state", 42)

    imports = ["from sklearn.linear_model import LogisticRegression"]

    code = (
        f'X_train = {split}_train.drop(columns=[{split}_target_col])\n'
        f'y_train = {split}_train[{split}_target_col]\n'
        f'{df_out} = {split}_test\n'
        f'{model_out} = LogisticRegression(C={C}, solver="{solver}", max_iter={max_iter}, random_state={random_state})\n'
        f'{model_out}.fit(X_train, y_train)\n'
        f'print(f"Train accuracy: {{{model_out}.score(X_train, y_train):.4f}}")\n'
    )
    return imports, code
