"""Unique node — drop duplicate rows from a DataFrame."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")

    df = df.copy()

    subset_columns = parameters.get("subset_columns", [])
    keep = parameters.get("keep", "first")

    subset = subset_columns if subset_columns else None

    # pandas drop_duplicates expects keep=False to remove all duplicates
    keep_arg = False if keep == "none" else keep

    df = df.drop_duplicates(subset=subset, keep=keep_arg).reset_index(drop=True)

    return {"dataframe_out": df}
