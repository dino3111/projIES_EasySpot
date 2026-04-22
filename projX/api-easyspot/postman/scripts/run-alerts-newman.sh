#!/usr/bin/env bash
set -euo pipefail

mkdir -p newman

newman run postman/EasySpot_AlertSubscriptions.postman_collection.json \
  --working-dir . \
  --bail failure \
  --disable-unicode \
  --reporters cli,junit,json \
  --reporter-junit-export newman/easyspot-alert-subscriptions.xml \
  --reporter-json-export newman/easyspot-alert-subscriptions.json
