"""Lasso Regression node — trains a lasso regression model with L1 regularization."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from sklearn.linear_model import Lasso

    split_data = inputs["split_data_in"]
    target_col = split_data["target_col"]
    train_df = split_data["train"]
    test_df = split_data["test"]

    X_train = train_df.drop(columns=[target_col])
    y_train = train_df[target_col]

    model = Lasso(
        alpha=parameters.get("alpha", 1.0),
        max_iter=parameters.get("max_iter", 1000),
    )
    model.fit(X_train, y_train)

    return {
        "model_out": model,
        "dataframe_out": test_df,
    }
