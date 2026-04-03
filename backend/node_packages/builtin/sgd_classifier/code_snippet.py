"""Code snippet for SGD Classifier node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    split = input_vars.get("split_data_in", "split")
    model_out = output_vars.get("model_out", "model")
    df_out = output_vars.get("dataframe_out", "df_test")

    loss = params.get("loss", "hinge")
    alpha = params.get("alpha", 0.0001)
    max_iter = params.get("max_iter", 1000)
    penalty = params.get("penalty", "l2")
    random_state = params.get("random_state", 42)

    imports = ["from sklearn.linear_model import SGDClassifier"]

    code = (
        f'X_train = {split}_train.drop(columns=[{split}_target_col])\n'
        f'y_train = {split}_train[{split}_target_col]\n'
        f'{df_out} = {split}_test\n'
        f'{model_out} = SGDClassifier(loss="{loss}", alpha={alpha}, max_iter={max_iter}, '
        f'penalty="{penalty}", random_state={random_state})\n'
        f'{model_out}.fit(X_train, y_train)\n'
    )
    return imports, code
