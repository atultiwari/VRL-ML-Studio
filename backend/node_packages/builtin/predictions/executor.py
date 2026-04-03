"""Predictions node — generate a table of model predictions alongside actual values."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd
    from sklearn.metrics import accuracy_score, r2_score

    model = inputs["model_in"]
    df = inputs["dataframe_in"]

    target_col = parameters.get("target_col")
    if not target_col:
        raise ValueError("target_col parameter is required. Select the target column.")

    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in DataFrame.")

    include_probabilities = parameters.get("include_probabilities", False)

    X_test = df.drop(columns=[target_col])
    y_test = df[target_col]

    y_pred = model.predict(X_test)

    result_df = pd.DataFrame(
        {"actual": y_test.values, "predicted": y_pred}
    )

    if include_probabilities and hasattr(model, "predict_proba"):
        probas = model.predict_proba(X_test)
        classes = model.classes_
        for i, cls in enumerate(classes):
            result_df[f"prob_{cls}"] = probas[:, i]

    result_df["correct"] = result_df["actual"] == result_df["predicted"]

    # Detect classification vs regression by target dtype
    is_classification = y_test.dtype == "object" or y_test.nunique() <= 20

    metrics: dict = {
        "total_samples": len(y_test),
    }

    if is_classification:
        acc = accuracy_score(y_test, y_pred)
        correct_count = int(result_df["correct"].sum())
        metrics["accuracy"] = round(acc, 4)
        metrics["correct_predictions"] = correct_count
        metrics["incorrect_predictions"] = len(y_test) - correct_count
    else:
        r2 = r2_score(y_test, y_pred)
        metrics["r2_score"] = round(r2, 4)
        residuals = y_test.values - y_pred
        metrics["mean_residual"] = round(float(residuals.mean()), 4)
        metrics["std_residual"] = round(float(residuals.std()), 4)
        # Remove boolean 'correct' column for regression
        result_df = result_df.drop(columns=["correct"])

    return {
        "dataframe_out": result_df,
        "metrics_out": metrics,
    }
