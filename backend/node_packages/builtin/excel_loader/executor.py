"""Excel Loader node — reads an .xlsx / .xls file from an uploaded path."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd

    file_path = parameters.get("file_path", "").strip()
    if not file_path:
        raise ValueError("No file selected. Use the file picker in the parameter panel to upload an Excel file.")

    sheet = parameters.get("sheet_name", "0")
    # Allow numeric sheet index stored as string
    try:
        sheet = int(sheet)
    except (ValueError, TypeError):
        pass

    header_row = int(parameters.get("header_row", 0))

    df = pd.read_excel(file_path, sheet_name=sheet, header=header_row, engine="openpyxl")

    return {"dataframe_out": df}
