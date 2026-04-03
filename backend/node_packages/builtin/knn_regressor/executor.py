"""KNN Regressor node — trains a k-nearest neighbors model for regression tasks."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from sklearn.neighbors import KNeighborsRegressor

    split_data = inputs["split_data_in"]
    target_col = split_data["target_col"]
    train_df = split_data["train"]
    test_df = split_data["test"]

    X_train = train_df.drop(columns=[target_col])
    y_train = train_df[target_col]

    model = KNeighborsRegressor(
        n_neighbors=parameters.get("n_neighbors", 5),
        weights=parameters.get("weights", "uniform"),
        metric=parameters.get("metric", "euclidean"),
    )
    model.fit(X_train, y_train)

    return {
        "model_out": model,
        "dataframe_out": test_df,
    }
