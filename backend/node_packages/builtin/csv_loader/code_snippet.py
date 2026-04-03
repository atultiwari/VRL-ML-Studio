"""Code snippet for CSV File Import node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    imports = ["import pandas as pd"]
    out = output_vars.get("dataframe_out", "df")

    file_path = params.get("file_path", "data/input.csv")
    delimiter = params.get("delimiter", ",")
    encoding = params.get("encoding", "utf-8") or "utf-8"
    header_row = params.get("header_row", 0)
    parse_dates = params.get("parse_dates", False)

    args = [f'"{file_path}"']
    if delimiter != ",":
        args.append(f'sep="{delimiter}"')
    if encoding != "utf-8":
        args.append(f'encoding="{encoding}"')
    if header_row != 0:
        args.append(f"header={header_row}")
    if parse_dates:
        args.append("parse_dates=True")

    code = f'{out} = pd.read_csv({", ".join(args)})\n'
    code += f'print(f"{label}: {{{out}.shape}}")\n'

    return imports, code
