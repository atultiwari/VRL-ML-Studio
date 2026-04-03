"""SQL Table node — loads data from a SQL database (SQLite, PostgreSQL, or MySQL)."""

import re


def execute(inputs: dict, parameters: dict, context: dict) -> dict:
    import pandas as pd

    db_type = parameters.get("db_type", "sqlite")
    connection_string = parameters.get("connection_string", "").strip()
    query = parameters.get("query", "SELECT * FROM table_name LIMIT 1000").strip()
    table_name = parameters.get("table_name", "").strip()

    if not connection_string:
        raise ValueError(
            "Connection string is required. "
            "For SQLite: path to .db file. "
            "For PostgreSQL: postgresql://user:pass@host:port/db. "
            "For MySQL: mysql://user:pass@host:port/db."
        )

    # If table_name is provided, build a safe query from it
    if table_name:
        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", table_name):
            raise ValueError(
                "Invalid table name. "
                "Table name must contain only letters, digits, and underscores."
            )
        query = f"SELECT * FROM {table_name}"

    if db_type == "sqlite":
        import sqlite3

        conn = sqlite3.connect(connection_string)
        try:
            df = pd.read_sql(query, conn)
        finally:
            conn.close()
    else:
        try:
            from sqlalchemy import create_engine
        except ImportError as exc:
            raise ImportError(
                "sqlalchemy is required for PostgreSQL and MySQL connections. "
                "Install it with: pip install sqlalchemy"
            ) from exc

        if db_type == "postgresql":
            try:
                import psycopg2  # noqa: F401
            except ImportError as exc:
                raise ImportError(
                    "psycopg2 is required for PostgreSQL connections. "
                    "Install it with: pip install psycopg2-binary"
                ) from exc
        elif db_type == "mysql":
            try:
                import pymysql  # noqa: F401
            except ImportError as exc:
                raise ImportError(
                    "pymysql is required for MySQL connections. "
                    "Install it with: pip install pymysql"
                ) from exc

        engine = create_engine(connection_string)
        try:
            df = pd.read_sql(query, engine)
        finally:
            engine.dispose()

    return {"dataframe_out": df}
