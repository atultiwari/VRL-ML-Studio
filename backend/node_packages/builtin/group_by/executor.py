"""Group By node — group rows and compute aggregate statistics."""


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import logging

    import numpy as np

    logger = logging.getLogger(__name__)

    df = inputs.get("dataframe_in")
    if df is None:
        raise ValueError("No input DataFrame provided.")

    group_columns = parameters.get("group_columns", [])
    if not group_columns:
        raise ValueError(
            "No group columns specified. Select at least one column to group by."
        )

    aggregation = parameters.get("aggregation", "mean")
    value_columns = parameters.get("value_columns", [])

    missing = [c for c in group_columns if c not in df.columns]
    if missing:
        raise ValueError(f"Group columns not found in DataFrame: {missing}")

    if value_columns:
        missing_vals = [c for c in value_columns if c not in df.columns]
        if missing_vals:
            logger.warning(
                "Value columns not found in DataFrame (ignored): %s", missing_vals
            )
        value_columns = [c for c in value_columns if c in df.columns]
        subset = df[group_columns + value_columns]
    else:
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        non_group_numeric = [c for c in numeric_cols if c not in group_columns]
        subset = df[group_columns + non_group_numeric]

    grouped = subset.groupby(group_columns, as_index=False).agg(aggregation)

    logger.info(
        "Grouped by %s using '%s': %d rows -> %d rows.",
        group_columns,
        aggregation,
        len(df),
        len(grouped),
    )

    return {"dataframe_out": grouped}
