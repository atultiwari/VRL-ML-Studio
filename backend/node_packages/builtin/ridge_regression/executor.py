"""Ridge Regression node — trains a ridge regression model with L2 regularization."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from sklearn.linear_model import Ridge

    split_data = inputs["split_data_in"]
    target_col = split_data["target_col"]
    train_df = split_data["train"]
    test_df = split_data["test"]

    X_train = train_df.drop(columns=[target_col])
    y_train = train_df[target_col]

    model = Ridge(
        alpha=parameters.get("alpha", 1.0),
        solver=parameters.get("solver", "auto"),
    )
    model.fit(X_train, y_train)

    return {
        "model_out": model,
        "dataframe_out": test_df,
    }
