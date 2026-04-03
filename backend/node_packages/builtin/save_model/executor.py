"""Save Model node — save a trained model to disk as a .joblib file."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import os

    import joblib

    model = inputs["model_in"]

    filename = parameters.get("filename", "model.joblib")
    if not filename.endswith(".joblib"):
        filename += ".joblib"

    project_path = context.get("project_path", ".")
    exports_dir = os.path.join(project_path, "exports")
    os.makedirs(exports_dir, exist_ok=True)

    filepath = os.path.join(exports_dir, filename)
    joblib.dump(model, filepath)

    file_size = os.path.getsize(filepath)
    model_type = type(model).__name__

    # Format file size for display
    if file_size < 1024:
        size_str = f"{file_size} B"
    elif file_size < 1024 * 1024:
        size_str = f"{file_size / 1024:.1f} KB"
    else:
        size_str = f"{file_size / (1024 * 1024):.1f} MB"

    return {
        "metrics_out": {
            "file_path": filepath,
            "model_type": model_type,
            "file_size": size_str,
            "file_size_bytes": file_size,
        },
    }
