"""Train-Test Splitter node — splits a DataFrame into train and test subsets."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd
    from sklearn.model_selection import train_test_split

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")
    if not isinstance(df, pd.DataFrame):
        raise ValueError("Input must be a pandas DataFrame.")

    test_size = float(parameters.get("test_size", 0.2))
    random_state = int(parameters.get("random_state", 42))
    do_stratify = bool(parameters.get("stratify", False))
    target_col = parameters.get("target_col")

    if len(df) < 2:
        raise ValueError("DataFrame must have at least 2 rows to split.")

    stratify_series = None
    if do_stratify:
        if not target_col:
            raise ValueError("Stratification requires a target column.")
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found in DataFrame.")
        stratify_series = df[target_col]

    train_df, test_df = train_test_split(
        df,
        test_size=test_size,
        random_state=random_state,
        stratify=stratify_series,
    )

    return {
        "split_data_out": {
            "train": train_df.reset_index(drop=True),
            "test": test_df.reset_index(drop=True),
            "target_col": target_col,
        }
    }
