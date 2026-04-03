"""AdaBoost node — trains an adaptive boosting ensemble for classification."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from sklearn.ensemble import AdaBoostClassifier

    split_data = inputs["split_data_in"]
    target_col = split_data["target_col"]
    train_df = split_data["train"]
    test_df = split_data["test"]

    X_train = train_df.drop(columns=[target_col])
    y_train = train_df[target_col]

    model = AdaBoostClassifier(
        n_estimators=parameters.get("n_estimators", 50),
        learning_rate=parameters.get("learning_rate", 1.0),
        random_state=parameters.get("random_state", 42),
    )
    model.fit(X_train, y_train)

    return {
        "model_out": model,
        "dataframe_out": test_df,
    }
