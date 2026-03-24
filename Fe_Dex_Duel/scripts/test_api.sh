#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_COOKIE="${ADMIN_COOKIE:-}"
CHAIN_ROUND_ID="${CHAIN_ROUND_ID:-}"

print_header() {
  echo ""
  echo "===================="
  echo "$1"
  echo "===================="
}

if [[ -z "$ADMIN_COOKIE" ]]; then
  echo "ADMIN_COOKIE is not set."
  echo "Obtain it by logging in as admin via /api/auth/nonce + /api/auth/verify, then copy the dd_admin_session cookie." 
  echo "Run with: ADMIN_COOKIE='dd_admin_session=...' BASE_URL=$BASE_URL ./scripts/test_api.sh"
fi

print_header "1) GET /api/tournaments"
curl -i -sS "$BASE_URL/api/tournaments"

echo ""

print_header "2) POST /api/admin/tournaments/create"
CREATE_BODY='{"pairSymbol":"BTC/USDT","startTimeMs":1760000000000,"endTimeMs":1760000300000,"seasonNo":1}'
if [[ -n "$ADMIN_COOKIE" ]]; then
  curl -i -sS \
    -H "Content-Type: application/json" \
    -H "Cookie: $ADMIN_COOKIE" \
    -d "$CREATE_BODY" \
    "$BASE_URL/api/admin/tournaments/create"
else
  echo "Skipping create: ADMIN_COOKIE not set"
fi

echo ""

print_header "3) POST /api/admin/tournaments/[roundId]/cancel"
if [[ -z "$CHAIN_ROUND_ID" ]]; then
  echo "CHAIN_ROUND_ID not set. Provide a chain round id to test cancel:"
  echo "CHAIN_ROUND_ID='0x...' ADMIN_COOKIE='dd_admin_session=...' ./scripts/test_api.sh"
else
  if [[ -n "$ADMIN_COOKIE" ]]; then
    curl -i -sS \
      -H "Content-Type: application/json" \
      -H "Cookie: $ADMIN_COOKIE" \
      -X POST \
      "$BASE_URL/api/admin/tournaments/$CHAIN_ROUND_ID/cancel"
  else
    echo "Skipping cancel: ADMIN_COOKIE not set"
  fi
fi

echo ""

print_header "4) Guard check (cancel non-upcoming)"
if [[ -n "$ADMIN_COOKIE" && -n "$CHAIN_ROUND_ID" ]]; then
  echo "Reusing CHAIN_ROUND_ID for guard check. Expect 400 if not UPCOMING."
  curl -i -sS \
    -H "Content-Type: application/json" \
    -H "Cookie: $ADMIN_COOKIE" \
    -X POST \
    "$BASE_URL/api/admin/tournaments/$CHAIN_ROUND_ID/cancel"
else
  echo "Skipping guard check: provide ADMIN_COOKIE and CHAIN_ROUND_ID"
fi