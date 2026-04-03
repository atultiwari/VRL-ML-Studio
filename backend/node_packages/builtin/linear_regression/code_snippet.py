"""Code snippet for Linear Regression node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    split = input_vars.get("split_data_in", "split")
    model_out = output_vars.get("model_out", "model")
    df_out = output_vars.get("dataframe_out", "df_test")

    fit_intercept = params.get("fit_intercept", True)

    imports = ["from sklearn.linear_model import LinearRegression"]

    code = (
        f'X_train = {split}_train.drop(columns=[{split}_target_col])\n'
        f'y_train = {split}_train[{split}_target_col]\n'
        f'{df_out} = {split}_test\n'
        f'{model_out} = LinearRegression(fit_intercept={fit_intercept})\n'
        f'{model_out}.fit(X_train, y_train)\n'
        f'print(f"R² (train): {{{model_out}.score(X_train, y_train):.4f}}")\n'
    )
    return imports, code
