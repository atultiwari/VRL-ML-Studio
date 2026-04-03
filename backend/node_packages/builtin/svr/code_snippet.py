"""Code snippet for SVR node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    split = input_vars.get("split_data_in", "split")
    model_out = output_vars.get("model_out", "model")
    df_out = output_vars.get("dataframe_out", "df_test")

    C = params.get("C", 1.0)
    kernel = params.get("kernel", "rbf")
    epsilon = params.get("epsilon", 0.1)

    imports = ["from sklearn.svm import SVR"]

    code = (
        f'X_train = {split}_train.drop(columns=[{split}_target_col])\n'
        f'y_train = {split}_train[{split}_target_col]\n'
        f'{df_out} = {split}_test\n'
        f'{model_out} = SVR(C={C}, kernel="{kernel}", epsilon={epsilon})\n'
        f'{model_out}.fit(X_train, y_train)\n'
    )
    return imports, code
