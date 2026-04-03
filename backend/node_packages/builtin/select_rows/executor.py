"""Select Rows node — filter rows by conditions on column values."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")
    if not isinstance(df, pd.DataFrame):
        raise ValueError("Input must be a pandas DataFrame.")

    df = df.copy()

    column = parameters.get("column", "")
    operator = parameters.get("operator", "==")
    value = parameters.get("value", "")

    if not column:
        raise ValueError("No column specified for filtering.")
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found in DataFrame.")

    series = df[column]

    if operator == "is_null":
        mask = pd.isna(series)
    elif operator == "not_null":
        mask = pd.notna(series)
    elif operator == "contains":
        mask = series.astype(str).str.contains(str(value), na=False)
    elif operator == "in":
        in_values = [v.strip() for v in str(value).split(",")]
        # Try numeric conversion for each value
        converted = []
        for v in in_values:
            try:
                converted.append(float(v) if "." in v else int(v))
            except (ValueError, TypeError):
                converted.append(v)
        mask = series.isin(converted)
    else:
        # Comparison operators: ==, !=, >, <, >=, <=
        # Try numeric conversion first, fall back to string comparison
        compare_value = value
        try:
            compare_value = float(value) if "." in str(value) else int(value)
        except (ValueError, TypeError):
            compare_value = str(value)

        if operator == "==":
            mask = series == compare_value
        elif operator == "!=":
            mask = series != compare_value
        elif operator == ">":
            mask = series > compare_value
        elif operator == "<":
            mask = series < compare_value
        elif operator == ">=":
            mask = series >= compare_value
        elif operator == "<=":
            mask = series <= compare_value
        else:
            raise ValueError(f"Unknown operator: {operator}")

    df = df.loc[mask].reset_index(drop=True)

    return {"dataframe_out": df}
