"""Code snippet for Data Sampler node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("split_data_out", "split")

    test_size = params.get("test_size", 0.2)
    random_state = params.get("random_state", 42)
    stratify = params.get("stratify", False)
    target_col = params.get("target_col", "")

    imports = ["from sklearn.model_selection import train_test_split"]

    args = [
        inp,
        f"test_size={test_size}",
        f"random_state={random_state}",
    ]
    if stratify and target_col:
        args.append(f'stratify={inp}["{target_col}"]')

    tc_repr = f'"{target_col}"' if target_col else "None"

    code = (
        f'{out}_train, {out}_test = train_test_split({", ".join(args)})\n'
        f'{out}_target_col = {tc_repr}\n'
        f'print(f"Train: {{{out}_train.shape}}, Test: {{{out}_test.shape}}")\n'
    )

    return imports, code
