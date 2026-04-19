#!/bin/sh
set -eu

: "${STRIPE_WEBHOOK_FORWARD_TO:?set STRIPE_WEBHOOK_FORWARD_TO in the environment}"

if [ ! -f /run/secrets/stripe_api_key ]; then
	echo "Missing /run/secrets/stripe_api_key file"
	exit 1
fi

STRIPE_API_KEY="$(cat /run/secrets/stripe_api_key)"
if [ -z "$STRIPE_API_KEY" ]; then
	echo "Stripe API key file is empty"
	exit 1
fi
export STRIPE_API_KEY

exec stripe listen --forward-to "$STRIPE_WEBHOOK_FORWARD_TO"
