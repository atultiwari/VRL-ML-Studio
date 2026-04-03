"""Code snippet for MLP Classifier node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    split = input_vars.get("split_data_in", "split")
    model_out = output_vars.get("model_out", "model")
    df_out = output_vars.get("dataframe_out", "df_test")

    hidden_layers = params.get("hidden_layers", "100,50")
    activation = params.get("activation", "relu")
    solver = params.get("solver", "adam")
    learning_rate_init = params.get("learning_rate_init", 0.001)
    max_iter = params.get("max_iter", 200)
    alpha = params.get("alpha", 0.0001)
    random_state = params.get("random_state", 42)

    layers_tuple = tuple(int(x.strip()) for x in hidden_layers.split(",") if x.strip())

    imports = ["from sklearn.neural_network import MLPClassifier"]

    code = (
        f'X_train = {split}_train.drop(columns=[{split}_target_col])\n'
        f'y_train = {split}_train[{split}_target_col]\n'
        f'{df_out} = {split}_test\n'
        f'{model_out} = MLPClassifier(hidden_layer_sizes={layers_tuple}, activation="{activation}", '
        f'solver="{solver}", learning_rate_init={learning_rate_init}, max_iter={max_iter}, '
        f'alpha={alpha}, random_state={random_state})\n'
        f'{model_out}.fit(X_train, y_train)\n'
    )
    return imports, code
