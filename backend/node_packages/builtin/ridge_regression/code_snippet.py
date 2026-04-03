"""Code snippet for Ridge Regression node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    split = input_vars.get("split_data_in", "split")
    model_out = output_vars.get("model_out", "model")
    df_out = output_vars.get("dataframe_out", "df_test")

    alpha = params.get("alpha", 1.0)
    solver = params.get("solver", "auto")

    imports = ["from sklearn.linear_model import Ridge"]

    code = (
        f'X_train = {split}_train.drop(columns=[{split}_target_col])\n'
        f'y_train = {split}_train[{split}_target_col]\n'
        f'{df_out} = {split}_test\n'
        f'{model_out} = Ridge(alpha={alpha}, solver="{solver}")\n'
        f'{model_out}.fit(X_train, y_train)\n'
    )
    return imports, code
