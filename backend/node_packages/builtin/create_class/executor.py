"""Create Class node — designate or create a target (class) column for prediction."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")
    if not isinstance(df, pd.DataFrame):
        raise ValueError("Input must be a pandas DataFrame.")

    df = df.copy()

    mode = parameters.get("mode", "designate")

    if mode == "designate":
        target_col = parameters.get("target_col", "")
        if not target_col:
            raise ValueError("No target column specified in designate mode.")
        if target_col not in df.columns:
            raise ValueError(f"Column '{target_col}' not found in DataFrame.")

        col = df.pop(target_col)
        df[target_col] = col

    elif mode == "from_expression":
        expression = parameters.get("expression", "")
        if not expression:
            raise ValueError("No expression provided in from_expression mode.")

        new_col_name = parameters.get("new_col_name", "target")
        class_labels_raw = parameters.get("class_labels", "0,1")
        labels = [s.strip() for s in class_labels_raw.split(",")]

        if len(labels) != 2:
            raise ValueError(
                f"Expected exactly 2 class labels (got {len(labels)}). "
                "Provide comma-separated labels like '0,1' or 'no,yes'."
            )

        mask = df.eval(expression)

        if not hasattr(mask, "dtype"):
            raise ValueError(
                f"Expression '{expression}' did not produce a boolean series."
            )

        df[new_col_name] = mask.map({False: labels[0], True: labels[1]})

    else:
        raise ValueError(f"Unknown mode: {mode}")

    return {"dataframe_out": df}
