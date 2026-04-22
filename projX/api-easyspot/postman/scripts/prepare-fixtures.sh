#!/usr/bin/env bash
set -euo pipefail

mkdir -p postman/files

if [ ! -f postman/files/max-size-10mb.jpg ] || [ "$(wc -c < postman/files/max-size-10mb.jpg)" -ne 10485760 ]; then
  dd if=/dev/zero of=postman/files/max-size-10mb.jpg bs=1M count=10 status=none
fi

if [ ! -f postman/files/oversized.jpg ] || [ "$(wc -c < postman/files/oversized.jpg)" -le 10485760 ]; then
  dd if=/dev/zero of=postman/files/oversized.jpg bs=1M count=11 status=none
fi

