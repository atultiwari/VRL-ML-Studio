"""Load Model node — load a previously saved model from a .joblib file."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import os

    import joblib

    filepath = parameters.get("filepath", "")
    if not filepath:
        raise ValueError("filepath parameter is required. Specify the path to a .joblib file.")

    # If relative path, resolve relative to project exports directory
    if not os.path.isabs(filepath):
        project_path = context.get("project_path", ".")
        candidate = os.path.join(project_path, "exports", filepath)
        if os.path.exists(candidate):
            filepath = candidate
        else:
            candidate_root = os.path.join(project_path, filepath)
            if os.path.exists(candidate_root):
                filepath = candidate_root

    if not os.path.exists(filepath):
        raise ValueError(f"Model file not found: {filepath}")

    if not filepath.endswith(".joblib"):
        raise ValueError("Only .joblib model files are supported.")

    model = joblib.load(filepath)

    return {
        "model_out": model,
    }
