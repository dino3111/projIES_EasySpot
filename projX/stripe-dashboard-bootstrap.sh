#!/bin/sh
set -eu

: "${STRIPE_API_KEY:?set STRIPE_API_KEY}"
: "${STRIPE_WEBHOOK_PUBLIC_URL:?set STRIPE_WEBHOOK_PUBLIC_URL}"

STRIPE_WEBHOOK_EVENTS="${STRIPE_WEBHOOK_EVENTS:-payment_intent.succeeded,payment_intent.payment_failed,payment_intent.canceled,charge.refunded}"
STRIPE_WEBHOOK_DESCRIPTION="${STRIPE_WEBHOOK_DESCRIPTION:-EasySpot automated webhook endpoint}"
STRIPE_WEBHOOK_ENDPOINT_ID="${STRIPE_WEBHOOK_ENDPOINT_ID:-}"
STRIPE_REQUIRED_PAYMENT_METHODS="${STRIPE_REQUIRED_PAYMENT_METHODS:-card}"
STRIPE_PAYMENT_METHOD_CHECK_STRICT="${STRIPE_PAYMENT_METHOD_CHECK_STRICT:-false}"

api_post() {
  endpoint="$1"
  shift
  curl -sS -u "$STRIPE_API_KEY:" "$endpoint" "$@"
}

build_event_args() {
  events_csv="$1"
  old_ifs="$IFS"
  IFS=','
  set -- $events_csv
  IFS="$old_ifs"
  for event_name in "$@"; do
    trimmed="$(printf '%s' "$event_name" | tr -d '[:space:]')"
    if [ -n "$trimmed" ]; then
      printf '%s\n' "--data-urlencode" "enabled_events[]=$trimmed"
    fi
  done
}

echo "Configuring Stripe webhook endpoint..."

event_args_tmp="$(mktemp)"
build_event_args "$STRIPE_WEBHOOK_EVENTS" > "$event_args_tmp"

set --
while IFS= read -r line; do
  set -- "$@" "$line"
done < "$event_args_tmp"
rm -f "$event_args_tmp"

if [ -n "$STRIPE_WEBHOOK_ENDPOINT_ID" ]; then
  response="$(
    api_post "https://api.stripe.com/v1/webhook_endpoints/$STRIPE_WEBHOOK_ENDPOINT_ID" \
      --data-urlencode "url=$STRIPE_WEBHOOK_PUBLIC_URL" \
      --data-urlencode "description=$STRIPE_WEBHOOK_DESCRIPTION" \
      "$@"
  )"
  echo "Updated existing Stripe webhook endpoint: $STRIPE_WEBHOOK_ENDPOINT_ID"
else
  response="$(
    api_post "https://api.stripe.com/v1/webhook_endpoints" \
      --data-urlencode "url=$STRIPE_WEBHOOK_PUBLIC_URL" \
      --data-urlencode "description=$STRIPE_WEBHOOK_DESCRIPTION" \
      "$@"
  )"
  created_id="$(printf '%s' "$response" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\(we_[^"]*\)".*/\1/p' | head -n1)"
  if [ -n "$created_id" ]; then
    echo "Created Stripe webhook endpoint: $created_id"
    echo "Save this id as GitHub secret STRIPE_WEBHOOK_ENDPOINT_ID to make future deploys update instead of creating a new endpoint."
  else
    echo "Stripe webhook endpoint created/updated, but endpoint id could not be extracted from response."
  fi
fi

if [ "$STRIPE_REQUIRED_PAYMENT_METHODS" != "" ]; then
  echo "Checking required payment methods in Stripe account..."
  pm_response="$(curl -sS -u "$STRIPE_API_KEY:" "https://api.stripe.com/v1/payment_method_configurations?limit=5" || true)"

  missing=""
  old_ifs="$IFS"
  IFS=','
  set -- $STRIPE_REQUIRED_PAYMENT_METHODS
  IFS="$old_ifs"

  for pm in "$@"; do
    pm_trimmed="$(printf '%s' "$pm" | tr -d '[:space:]')"
    if [ -n "$pm_trimmed" ] && ! printf '%s' "$pm_response" | grep -q "\"$pm_trimmed\""; then
      if [ -z "$missing" ]; then
        missing="$pm_trimmed"
      else
        missing="$missing,$pm_trimmed"
      fi
    fi
  done

  if [ -n "$missing" ]; then
    message="Required payment methods were not detected via API: $missing. You may need to enable them in Stripe Dashboard (or your account/country may not support them)."
    if [ "$STRIPE_PAYMENT_METHOD_CHECK_STRICT" = "true" ]; then
      echo "$message"
      exit 1
    fi
    echo "$message"
  else
    echo "Required payment methods check passed: $STRIPE_REQUIRED_PAYMENT_METHODS"
  fi
fi

echo "Stripe dashboard bootstrap completed."
