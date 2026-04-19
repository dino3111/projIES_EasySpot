#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    DO \$\$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'sonar') THEN
            CREATE USER sonar WITH PASSWORD '${SONAR_DB_PASSWORD}';
        END IF;
    END \$\$;

    SELECT 'CREATE DATABASE sonar OWNER sonar'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'sonar')\gexec

    DO \$\$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${APP_DB_USER}') THEN
            CREATE USER ${APP_DB_USER} WITH PASSWORD '${APP_DB_PASS}';
        END IF;
    END \$\$;

    SELECT 'CREATE DATABASE ${APP_DB} OWNER ${APP_DB_USER}'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${APP_DB}')\gexec
EOSQL
