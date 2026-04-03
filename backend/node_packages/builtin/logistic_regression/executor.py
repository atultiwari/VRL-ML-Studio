"""Logistic Regression node — trains a logistic regression classifier."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from sklearn.linear_model import LogisticRegression

    split_data = inputs["split_data_in"]
    target_col = split_data["target_col"]
    train_df = split_data["train"]
    test_df = split_data["test"]

    X_train = train_df.drop(columns=[target_col])
    y_train = train_df[target_col]

    model = LogisticRegression(
        C=parameters.get("C", 1.0),
        solver=parameters.get("solver", "lbfgs"),
        max_iter=parameters.get("max_iter", 100),
        multi_class=parameters.get("multi_class", "auto"),
        random_state=parameters.get("random_state", 42),
    )
    model.fit(X_train, y_train)

    return {
        "model_out": model,
        "dataframe_out": test_df,
    }
