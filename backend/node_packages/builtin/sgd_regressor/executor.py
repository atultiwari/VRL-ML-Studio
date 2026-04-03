"""SGD Regressor node — trains a linear regressor with stochastic gradient descent."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from sklearn.linear_model import SGDRegressor

    split_data = inputs["split_data_in"]
    target_col = split_data["target_col"]
    train_df = split_data["train"]
    test_df = split_data["test"]

    X_train = train_df.drop(columns=[target_col])
    y_train = train_df[target_col]

    model = SGDRegressor(
        loss=parameters.get("loss", "squared_error"),
        alpha=parameters.get("alpha", 0.0001),
        max_iter=parameters.get("max_iter", 1000),
        penalty=parameters.get("penalty", "l2"),
        random_state=parameters.get("random_state", 42),
    )
    model.fit(X_train, y_train)

    return {
        "model_out": model,
        "dataframe_out": test_df,
    }
