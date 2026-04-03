"""XGBoost Regressor node — trains a gradient boosted tree model for regression."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from xgboost import XGBRegressor

    split_data = inputs["split_data_in"]
    target_col = split_data["target_col"]
    train_df = split_data["train"]
    test_df = split_data["test"]

    X_train = train_df.drop(columns=[target_col])
    y_train = train_df[target_col]

    model = XGBRegressor(
        n_estimators=parameters.get("n_estimators", 100),
        learning_rate=parameters.get("learning_rate", 0.1),
        max_depth=parameters.get("max_depth", 6),
        subsample=parameters.get("subsample", 1.0),
        random_state=parameters.get("random_state", 42),
    )
    model.fit(X_train, y_train)

    return {
        "model_out": model,
        "dataframe_out": test_df,
    }
