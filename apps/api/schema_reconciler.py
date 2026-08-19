"""Additive schema reconciliation for a migration-less deployment.

This project has NO Alembic migrations. `Base.metadata.create_all` builds any
MISSING tables, but it never ALTERs a table that already exists. So when a
database already holds an OLDER version of a table — e.g. `users` created before
`full_name` was added — the new columns are never applied, and every query that
selects them fails with `UndefinedColumn`, taking down startup (ensure_system)
and every later request.

`reconcile_schema()` closes that gap SAFELY. For each table that already exists,
it adds any column defined on the SQLAlchemy model but missing from the live DB.
It is:
  - additive ONLY — never drops, renames, or retypes anything, so it cannot lose
    data;
  - always NULLABLE with no default — an `ADD COLUMN` that can never fail on a
    populated table (the model still enforces the value on new inserts);
  - idempotent — `ADD COLUMN IF NOT EXISTS`, and it re-inspects each run;
  - defensive — one uncompilable column is logged and skipped, never aborting
    startup.

A truly-empty database is handled entirely by create_all; this is the drift net
for databases that were previously provisioned by an older build.
"""
from __future__ import annotations

import logging

from sqlalchemy import inspect as sa_inspect, text

logger = logging.getLogger("schema_reconciler")


def reconcile_schema(engine, metadata) -> int:
    """Add model columns missing from already-existing tables. Returns the count
    of columns added. Never raises — failures are logged and skipped."""
    added = 0
    try:
        insp = sa_inspect(engine)
        existing_tables = set(insp.get_table_names())
    except Exception as e:  # noqa: BLE001
        logger.error(f"🔧 schema reconcile: could not inspect database: {e}")
        return 0

    for table in metadata.sorted_tables:
        if table.name not in existing_tables:
            # create_all already built this table fresh, with every column.
            continue
        try:
            db_cols = {c["name"] for c in insp.get_columns(table.name)}
        except Exception as e:  # noqa: BLE001
            logger.error(f"🔧 schema reconcile: cannot read columns of {table.name}: {e}")
            continue

        for col in table.columns:
            if col.name in db_cols:
                continue
            try:
                coltype = col.type.compile(dialect=engine.dialect)
            except Exception as e:  # noqa: BLE001
                logger.error(
                    f"🔧 schema reconcile: skip {table.name}.{col.name} "
                    f"(type not compilable): {e}"
                )
                continue
            # Always nullable, no default: an ADD COLUMN that cannot fail on a
            # table that already has rows. The ORM model still supplies the value
            # on every new insert, so integrity for new rows is preserved.
            ddl = (
                f'ALTER TABLE "{table.name}" '
                f'ADD COLUMN IF NOT EXISTS "{col.name}" {coltype}'
            )
            try:
                with engine.begin() as conn:
                    conn.execute(text(ddl))
                added += 1
                logger.info(
                    f"🔧 schema reconcile: added {table.name}.{col.name} ({coltype})"
                )
            except Exception as e:  # noqa: BLE001
                logger.error(
                    f"🔧 schema reconcile: failed to add {table.name}.{col.name}: {e}"
                )

    if added:
        logger.info(f"🔧 schema reconcile: {added} missing column(s) added.")
    return added
