"""Random Forest (Regressor) node — trains an ensemble of decision trees for regression."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from sklearn.ensemble import RandomForestRegressor

    split_data = inputs["split_data_in"]
    target_col = split_data["target_col"]
    train_df = split_data["train"]
    test_df = split_data["test"]

    X_train = train_df.drop(columns=[target_col])
    y_train = train_df[target_col]

    model = RandomForestRegressor(
        n_estimators=parameters.get("n_estimators", 100),
        max_depth=parameters.get("max_depth", None),
        max_features=parameters.get("max_features", "sqrt"),
        random_state=parameters.get("random_state", 42),
        min_samples_split=parameters.get("min_samples_split", 2),
    )
    model.fit(X_train, y_train)

    return {
        "model_out": model,
        "dataframe_out": test_df,
    }
