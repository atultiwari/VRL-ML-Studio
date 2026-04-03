"""Code snippet for Encoder node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    inp = input_vars.get("dataframe_in", "df")
    out = output_vars.get("dataframe_out", "df")

    method = params.get("method", "onehot")
    columns = params.get("columns", [])
    drop_first = params.get("drop_first", True)

    imports = ["import pandas as pd"]

    code = f'{out} = {inp}.copy()\n'

    if columns:
        code += f'_encode_cols = {repr(columns)}\n'
    else:
        code += f'_encode_cols = {out}.select_dtypes(include=["object", "category"]).columns.tolist()\n'

    if method == "onehot":
        code += f'{out} = pd.get_dummies({out}, columns=_encode_cols, drop_first={drop_first})\n'
    elif method == "label":
        imports.append("from sklearn.preprocessing import LabelEncoder")
        code += (
            f'for _col in _encode_cols:\n'
            f'    _le = LabelEncoder()\n'
            f'    {out}[_col] = _le.fit_transform({out}[_col].astype(str))\n'
        )
    elif method == "ordinal":
        imports.append("from sklearn.preprocessing import OrdinalEncoder")
        code += (
            f'_oe = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)\n'
            f'{out}[_encode_cols] = _oe.fit_transform({out}[_encode_cols].astype(str))\n'
        )

    return imports, code
