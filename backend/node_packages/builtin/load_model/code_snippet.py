"""Code snippet for Load Model node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    out_model = output_vars.get("model_out", "model")

    filepath = params.get("filepath", "model.joblib")

    imports = ["import joblib"]

    code = (
        f'{out_model} = joblib.load("{filepath}")\n'
        f'print(f"Loaded model: {{type({out_model}).__name__}}")\n'
    )
    return imports, code
