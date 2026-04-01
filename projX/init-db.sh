#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE USER sonar WITH PASSWORD '${SONAR_DB_PASSWORD}';
    CREATE DATABASE sonar OWNER sonar;
EOSQL
