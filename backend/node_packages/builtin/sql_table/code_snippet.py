"""Code snippet for SQL Table node."""


def get_snippet(params: dict, input_vars: dict, output_vars: dict, label: str):
    out = output_vars.get("dataframe_out", "df")

    db_type = params.get("db_type", "sqlite")
    connection_string = params.get("connection_string", "database.db")
    query = params.get("query", "SELECT * FROM table_name LIMIT 1000")
    table_name = params.get("table_name", "")

    if table_name:
        query = f"SELECT * FROM {table_name}"

    if db_type == "sqlite":
        imports = ["import sqlite3", "import pandas as pd"]
        code = (
            f'_conn = sqlite3.connect("{connection_string}")\n'
            f'{out} = pd.read_sql("{query}", _conn)\n'
            f'_conn.close()\n'
            f'print(f"{label}: {{{out}.shape}}")\n'
        )
    else:
        imports = ["from sqlalchemy import create_engine", "import pandas as pd"]
        code = (
            f'_engine = create_engine("{connection_string}")\n'
            f'{out} = pd.read_sql("{query}", _engine)\n'
            f'_engine.dispose()\n'
            f'print(f"{label}: {{{out}.shape}}")\n'
        )

    return imports, code
