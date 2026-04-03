"""Classification Report node — computes precision, recall, F1, and accuracy."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    from sklearn.metrics import classification_report as sk_classification_report

    model = inputs["model_in"]
    df = inputs["dataframe_in"]

    target_col = parameters.get("target_col")
    if not target_col:
        raise ValueError("target_col parameter is required. Select the target column.")

    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in DataFrame.")

    X_test = df.drop(columns=[target_col])
    y_test = df[target_col]

    y_pred = model.predict(X_test)

    report = sk_classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    metrics: dict = {
        "accuracy": report["accuracy"],
        "precision_macro": report["macro avg"]["precision"],
        "recall_macro": report["macro avg"]["recall"],
        "f1_macro": report["macro avg"]["f1-score"],
        "precision_weighted": report["weighted avg"]["precision"],
        "recall_weighted": report["weighted avg"]["recall"],
        "f1_weighted": report["weighted avg"]["f1-score"],
        "support_total": int(report["weighted avg"]["support"]),
    }

    # Add per-class metrics
    for label, values in report.items():
        if label in ("accuracy", "macro avg", "weighted avg"):
            continue
        safe_label = str(label).replace(" ", "_")
        metrics[f"class_{safe_label}_precision"] = values["precision"]
        metrics[f"class_{safe_label}_recall"] = values["recall"]
        metrics[f"class_{safe_label}_f1"] = values["f1-score"]
        metrics[f"class_{safe_label}_support"] = int(values["support"])

    return {"metrics_out": metrics}
