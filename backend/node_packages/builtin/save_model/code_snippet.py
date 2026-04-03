"""Code snippet for Save Model node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    model_var = input_vars.get("model_in", "model")
    out_metrics = output_vars.get("metrics_out", "save_info")

    filename = params.get("filename", "model.joblib")
    if not filename.endswith(".joblib"):
        filename += ".joblib"

    imports = ["import joblib"]

    code = (
        f'joblib.dump({model_var}, "{filename}")\n'
        f'{out_metrics} = {{"file_path": "{filename}", '
        f'"model_type": type({model_var}).__name__}}\n'
        f'print(f"Model saved to {filename}")\n'
    )
    return imports, code
