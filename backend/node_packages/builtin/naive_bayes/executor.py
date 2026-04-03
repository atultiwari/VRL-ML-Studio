"""Naive Bayes (Gaussian) node — trains a Gaussian Naive Bayes classifier."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from sklearn.naive_bayes import GaussianNB

    split_data = inputs["split_data_in"]
    target_col = split_data["target_col"]
    train_df = split_data["train"]
    test_df = split_data["test"]

    X_train = train_df.drop(columns=[target_col])
    y_train = train_df[target_col]

    model = GaussianNB(
        var_smoothing=parameters.get("var_smoothing", 1e-9),
    )
    model.fit(X_train, y_train)

    return {
        "model_out": model,
        "dataframe_out": test_df,
    }
