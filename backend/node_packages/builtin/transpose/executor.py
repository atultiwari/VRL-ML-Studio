"""Transpose node — swap rows and columns of a DataFrame."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import logging

    logger = logging.getLogger(__name__)

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")

    df = df.copy()

    header_column = parameters.get("header_column", "")
    reset_index = parameters.get("reset_index", True)

    if header_column and header_column in df.columns:
        df = df.set_index(header_column)
        logger.info("Using column '%s' as index before transpose.", header_column)
    elif header_column and header_column not in df.columns:
        logger.warning(
            "Header column '%s' not found in DataFrame. Using default index.",
            header_column,
        )

    df = df.T

    if reset_index:
        df = df.reset_index()

    df.columns = [str(c) for c in df.columns]

    return {"dataframe_out": df}
