"""Code snippet for Excel Loader node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    imports = ["import pandas as pd"]
    out = output_vars.get("dataframe_out", "df")

    file_path = params.get("file_path", "data/input.xlsx")
    sheet_name = params.get("sheet_name", 0)
    header_row = params.get("header_row", 0)

    args = [f'"{file_path}"']
    if isinstance(sheet_name, str) and sheet_name:
        args.append(f'sheet_name="{sheet_name}"')
    elif isinstance(sheet_name, int) and sheet_name != 0:
        args.append(f"sheet_name={sheet_name}")
    if header_row != 0:
        args.append(f"header={header_row}")

    code = f'{out} = pd.read_excel({", ".join(args)})\n'
    code += f'print(f"{label}: {{{out}.shape}}")\n'

    return imports, code
