"""Column Dropper node — remove specified columns from a DataFrame."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import logging

    logger = logging.getLogger(__name__)

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")

    columns = parameters.get("columns", [])
    if not columns:
        raise ValueError("No columns specified to drop. Select at least one column.")

    df = df.copy()

    existing = [c for c in columns if c in df.columns]
    missing = [c for c in columns if c not in df.columns]

    if missing:
        logger.warning("Columns not found in DataFrame (ignored): %s", missing)

    if existing:
        df = df.drop(columns=existing)

    return {"dataframe_out": df}
