"""Code snippet for Passthrough node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    imports = []
    code = f'{out} = {inp}  # passthrough\n'

    return imports, code
