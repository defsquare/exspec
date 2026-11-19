#!/usr/bin/env bash
# Back to the starting state: every table but Flyway's emptied, then seed.sql reloaded,
# sequences included. Foreign keys are not checked while it loads: the dump's order is
# the tables', not their dependencies'.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)

{
  echo "SET session_replication_role = replica;"
  cat <<'SQL'
DO $$
DECLARE tables text;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ') INTO tables
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename <> 'flyway_schema_history';
  EXECUTE 'TRUNCATE ' || tables;
END $$;
SQL
  cat "$here/seed.sql"
} | docker compose -f "$here/compose.yaml" exec -T db \
  psql -q -v ON_ERROR_STOP=1 -U main main > /dev/null
