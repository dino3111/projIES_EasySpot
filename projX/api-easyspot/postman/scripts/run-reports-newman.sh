#!/usr/bin/env bash
set -euo pipefail

mkdir -p newman

newman run postman/EasySpot_Reports.postman_collection.json \
  --working-dir . \
  --bail failure \
  --disable-unicode \
  --reporters cli,junit,json \
  --reporter-junit-export newman/easyspot-reports.xml \
  --reporter-json-export newman/easyspot-reports.json

newman run postman/EasySpot_DriverSpending.postman_collection.json \
  --working-dir . \
  --bail failure \
  --disable-unicode \
  --reporters cli,junit,json \
  --reporter-junit-export newman/easyspot-driver-spending.xml \
  --reporter-json-export newman/easyspot-driver-spending.json
