"""Type Caster node — cast a column to a specified data type."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")

    column = parameters.get("column")
    if not column:
        raise ValueError("No column specified. Select a column to cast.")

    df = df.copy()

    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found in the DataFrame.")

    target_type = parameters.get("target_type", "float")
    errors = parameters.get("errors", "coerce")

    if target_type == "datetime":
        df[column] = pd.to_datetime(df[column], errors=errors)

    elif target_type in ("int", "float"):
        df[column] = pd.to_numeric(df[column], errors=errors)
        if target_type == "int":
            # Use nullable integer to preserve NaN from coerce
            df[column] = df[column].astype("Int64")
        else:
            df[column] = df[column].astype("float64")

    elif target_type == "str":
        df[column] = df[column].astype(str)

    elif target_type == "bool":
        df[column] = df[column].astype(bool)

    elif target_type == "category":
        df[column] = df[column].astype("category")

    else:
        raise ValueError(f"Unsupported target type: {target_type}")

    return {"dataframe_out": df}
