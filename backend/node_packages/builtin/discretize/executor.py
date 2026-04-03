"""Discretize node — convert continuous columns into categorical bins."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")
    if not isinstance(df, pd.DataFrame):
        raise ValueError("Input must be a pandas DataFrame.")

    df = df.copy()

    columns = parameters.get("columns", [])
    method = parameters.get("method", "equal_width")
    n_bins = int(parameters.get("n_bins", 5))
    custom_edges_str = parameters.get("custom_edges", "")
    labels_str = parameters.get("labels", "")

    # Default to all numeric columns when none specified
    if not columns:
        columns = df.select_dtypes(include=["number"]).columns.tolist()

    if not columns:
        return {"dataframe_out": df}

    missing_cols = [c for c in columns if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Columns not found in DataFrame: {missing_cols}")

    # Parse optional labels
    bin_labels = None
    if labels_str.strip():
        bin_labels = [lbl.strip() for lbl in labels_str.split(",") if lbl.strip()]

    if method == "custom":
        if not custom_edges_str.strip():
            raise ValueError(
                "Custom bin edges are required when method is 'custom'."
            )
        try:
            edges = [float(e.strip()) for e in custom_edges_str.split(",")]
        except ValueError:
            raise ValueError(
                "Custom bin edges must be comma-separated numbers."
            )
        if len(edges) < 2:
            raise ValueError("At least two bin edges are required.")

        if bin_labels and len(bin_labels) != len(edges) - 1:
            raise ValueError(
                f"Number of labels ({len(bin_labels)}) must equal "
                f"number of bins ({len(edges) - 1})."
            )

        for col in columns:
            df[col] = pd.cut(
                df[col],
                bins=edges,
                labels=bin_labels if bin_labels else None,
                include_lowest=True,
            )

    elif method == "equal_width":
        expected_label_count = n_bins
        if bin_labels and len(bin_labels) != expected_label_count:
            raise ValueError(
                f"Number of labels ({len(bin_labels)}) must equal "
                f"number of bins ({expected_label_count})."
            )

        for col in columns:
            df[col] = pd.cut(
                df[col],
                bins=n_bins,
                labels=bin_labels if bin_labels else None,
                include_lowest=True,
            )

    elif method == "equal_frequency":
        expected_label_count = n_bins
        if bin_labels and len(bin_labels) != expected_label_count:
            raise ValueError(
                f"Number of labels ({len(bin_labels)}) must equal "
                f"number of bins ({expected_label_count})."
            )

        for col in columns:
            df[col] = pd.qcut(
                df[col],
                q=n_bins,
                labels=bin_labels if bin_labels else None,
                duplicates="drop",
            )

    else:
        raise ValueError(f"Unknown binning method: {method}")

    return {"dataframe_out": df}
