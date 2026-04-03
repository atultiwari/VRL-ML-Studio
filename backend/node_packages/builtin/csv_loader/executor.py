"""CSV Loader node — reads a CSV/TSV file from an uploaded path."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd

    file_path = parameters.get("file_path", "").strip()
    if not file_path:
        raise ValueError("No file selected. Use the file picker in the parameter panel to upload a CSV.")

    delimiter = parameters.get("delimiter", ",")
    # Handle tab literal stored as string
    if delimiter == "\\t":
        delimiter = "\t"

    encoding   = parameters.get("encoding", "utf-8") or "utf-8"
    header_row = int(parameters.get("header_row", 0))
    parse_dates = bool(parameters.get("parse_dates", False))

    df = pd.read_csv(
        file_path,
        sep=delimiter,
        encoding=encoding,
        header=header_row,
        parse_dates=parse_dates,
    )

    return {"dataframe_out": df}
