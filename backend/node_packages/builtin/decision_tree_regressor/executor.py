"""Decision Tree Regressor node — trains a decision tree for regression tasks."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from sklearn.tree import DecisionTreeRegressor

    split_data = inputs["split_data_in"]
    target_col = split_data["target_col"]
    train_df = split_data["train"]
    test_df = split_data["test"]

    X_train = train_df.drop(columns=[target_col])
    y_train = train_df[target_col]

    model = DecisionTreeRegressor(
        max_depth=parameters.get("max_depth", None),
        min_samples_split=parameters.get("min_samples_split", 2),
        criterion=parameters.get("criterion", "squared_error"),
        random_state=parameters.get("random_state", 42),
    )
    model.fit(X_train, y_train)

    return {
        "model_out": model,
        "dataframe_out": test_df,
    }
