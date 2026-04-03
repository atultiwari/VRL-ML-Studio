"""MLP Classifier node — trains a multi-layer perceptron for classification."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from sklearn.neural_network import MLPClassifier

    split_data = inputs["split_data_in"]
    target_col = split_data["target_col"]
    train_df = split_data["train"]
    test_df = split_data["test"]

    X_train = train_df.drop(columns=[target_col])
    y_train = train_df[target_col]

    raw_layers = parameters.get("hidden_layers", "100,50")
    hidden_layer_sizes = tuple(
        int(x.strip()) for x in raw_layers.split(",") if x.strip()
    )

    model = MLPClassifier(
        hidden_layer_sizes=hidden_layer_sizes,
        activation=parameters.get("activation", "relu"),
        solver=parameters.get("solver", "adam"),
        learning_rate_init=parameters.get("learning_rate_init", 0.001),
        max_iter=parameters.get("max_iter", 200),
        alpha=parameters.get("alpha", 0.0001),
        random_state=parameters.get("random_state", 42),
    )
    model.fit(X_train, y_train)

    return {
        "model_out": model,
        "dataframe_out": test_df,
    }
