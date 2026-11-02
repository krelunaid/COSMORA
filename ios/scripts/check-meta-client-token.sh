#!/bin/sh
# Release archives must embed a real Meta client token. Debug builds stay runnable
# before the token is configured; they simply do not send App Events.
set -eu

token="${FACEBOOK_CLIENT_TOKEN:-}"
configuration="${CONFIGURATION:-Debug}"

if [ "$configuration" != "Release" ]; then
  exit 0
fi

fail() {
  echo "error: $1" >&2
  exit 1
}

case "$token" in
  ""|REPLACE*|YOUR_*|'$(FACEBOOK_CLIENT_TOKEN)')
    fail "COSMORA Release requires FACEBOOK_CLIENT_TOKEN. Copy ios/FacebookClientToken.xcconfig.example to ios/FacebookClientToken.xcconfig and paste the client token from Meta app 1609311830149459 > App settings > Advanced. Do not commit that file."
    ;;
esac

if ! printf '%s' "$token" | grep -Eq '^[A-Za-z0-9_-]{16,}$'; then
  fail "FACEBOOK_CLIENT_TOKEN is not a usable Meta client token."
fi
