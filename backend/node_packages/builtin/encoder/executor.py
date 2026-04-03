"""Encoder node — encodes categorical columns using one-hot, label, or ordinal encoding."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd
    from sklearn.preprocessing import LabelEncoder, OrdinalEncoder

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")
    if not isinstance(df, pd.DataFrame):
        raise ValueError("Input must be a pandas DataFrame.")

    df = df.copy()

    method = parameters.get("method", "onehot")
    columns = parameters.get("columns", [])
    drop_first = bool(parameters.get("drop_first", True))

    if not columns:
        columns = df.select_dtypes(include=["object", "category"]).columns.tolist()

    if not columns:
        return {"dataframe_out": df}

    missing_cols = [c for c in columns if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Columns not found in DataFrame: {missing_cols}")

    if method == "onehot":
        df = pd.get_dummies(df, columns=columns, drop_first=drop_first)

    elif method == "label":
        for col in columns:
            encoder = LabelEncoder()
            non_null_mask = df[col].notna()
            df.loc[non_null_mask, col] = encoder.fit_transform(
                df.loc[non_null_mask, col].astype(str)
            )

    elif method == "ordinal":
        encoder = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
        df[columns] = encoder.fit_transform(df[columns].astype(str))

    else:
        raise ValueError(f"Unknown encoding method: {method}")

    return {"dataframe_out": df}
