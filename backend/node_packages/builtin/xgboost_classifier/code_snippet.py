"""Code snippet for XGBoost node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    split = input_vars.get("split_data_in", "split")
    model_out = output_vars.get("model_out", "model")
    df_out = output_vars.get("dataframe_out", "df_test")

    n_estimators = params.get("n_estimators", 100)
    learning_rate = params.get("learning_rate", 0.1)
    max_depth = params.get("max_depth", 6)
    subsample = params.get("subsample", 1.0)
    random_state = params.get("random_state", 42)

    imports = ["from xgboost import XGBClassifier"]

    code = (
        f'X_train = {split}_train.drop(columns=[{split}_target_col])\n'
        f'y_train = {split}_train[{split}_target_col]\n'
        f'{df_out} = {split}_test\n'
        f'{model_out} = XGBClassifier(n_estimators={n_estimators}, learning_rate={learning_rate}, '
        f'max_depth={max_depth}, subsample={subsample}, random_state={random_state}, '
        f'use_label_encoder=False, eval_metric="logloss")\n'
        f'{model_out}.fit(X_train, y_train)\n'
    )
    return imports, code
