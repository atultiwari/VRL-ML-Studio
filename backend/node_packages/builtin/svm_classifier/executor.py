"""SVM node — trains a Support Vector Machine with probability estimates."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from sklearn.svm import SVC

    split_data = inputs["split_data_in"]
    target_col = split_data["target_col"]
    train_df = split_data["train"]
    test_df = split_data["test"]

    X_train = train_df.drop(columns=[target_col])
    y_train = train_df[target_col]

    model = SVC(
        C=parameters.get("C", 1.0),
        kernel=parameters.get("kernel", "rbf"),
        gamma=parameters.get("gamma", "scale"),
        degree=parameters.get("degree", 3),
        probability=True,
    )
    model.fit(X_train, y_train)

    return {
        "model_out": model,
        "dataframe_out": test_df,
    }
