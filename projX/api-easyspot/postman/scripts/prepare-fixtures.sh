#!/usr/bin/env bash
set -euo pipefail

mkdir -p postman/files

if [ ! -f postman/files/max-size-10mb.bin ] || [ "$(wc -c < postman/files/max-size-10mb.bin)" -ne 10485760 ]; then
  dd if=/dev/zero of=postman/files/max-size-10mb.bin bs=1M count=10 status=none
fi

if [ ! -f postman/files/oversized.bin ] || [ "$(wc -c < postman/files/oversized.bin)" -le 10485760 ]; then
  dd if=/dev/zero of=postman/files/oversized.bin bs=1M count=11 status=none
fi

