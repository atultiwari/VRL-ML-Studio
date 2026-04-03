"""Manual Data Entry node — parses CSV text entered by the user."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import io
    import pandas as pd

    csv_text = parameters.get("csv_text", "").strip()
    if not csv_text:
        raise ValueError("No data entered. Paste CSV-formatted text in the parameter panel.")

    df = pd.read_csv(io.StringIO(csv_text))
    return {"dataframe_out": df}
