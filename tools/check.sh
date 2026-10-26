#!/usr/bin/env bash
# Run the whole suite against index.html and say, in one word per test, whether
# it passed.
#
# It exists because the ad-hoc version of this did not work. That one grepped
# the output for "problems:" or "failures:", which most of the tests print -
# but hunt.js reports its failures as plain sentences, so when the offline
# generator started returning zero flashcards the sweep printed "hunt ok" and
# the bug went in. The pattern below covers every shape a failure takes in
# these files, and a test whose output it cannot classify is a FAIL, not a
# pass, because silence is the thing that bit.
#
#   bash tools/check.sh              every test
#   bash tools/check.sh study ai     only the ones named
set -uo pipefail
cd "$(dirname "$0")/tests" || exit 1

# The tests drive a real browser through Playwright. It is usually a global
# install, which node will not resolve from here on its own.
if ! node -e "require.resolve('playwright')" 2>/dev/null; then
  for d in "$(npm root -g 2>/dev/null)" /tmp/pw/node_modules "$HOME/node_modules"; do
    [ -n "$d" ] && [ -d "$d/playwright" ] && export NODE_PATH="$d${NODE_PATH:+:$NODE_PATH}" && break
  done
fi
if ! NODE_PATH="${NODE_PATH:-}" node -e "require.resolve('playwright')" 2>/dev/null; then
  echo "playwright not found - install it with:  npm i -g playwright" >&2
  exit 2
fi

FAIL_RE='PAGEERROR|problems: *[^n ]|failures: *[^n ]|not defined|made no |never reachable [^n]|Error:|undefined is not|✘ '
PASS_RE='problems: *none|failures: *none|errors: *none|errors: *\[\]|page errors: *none'
# The game is one offline file, but it does try for pdf.js from a CDN when you
# upload a PDF. In a sandbox with no egress that fails, the page falls back
# exactly as designed, and the browser logs it anyway - so it is noise, not a
# result, and it gets stripped before anything is judged.
NOISE_RE='net::ERR_|ERR_TUNNEL_CONNECTION_FAILED|ERR_CERT_AUTHORITY_INVALID|ERR_NAME_NOT_RESOLVED|Failed to load resource'

tests=("$@")
if [ ${#tests[@]} -eq 0 ]; then
  tests=()
  for f in *.js; do tests+=("${f%.js}"); done
fi

fails=0
for t in "${tests[@]}"; do
  if [ ! -f "$t.js" ]; then printf '%-14s %s\n' "$t" "MISSING"; fails=$((fails+1)); continue; fi
  out=$(node "$t.js" 2>&1 | grep -viE "$NOISE_RE")
  if grep -qiE "$FAIL_RE" <<<"$out"; then
    printf '%-14s %s\n' "$t" "FAIL"
    grep -iE "$FAIL_RE" <<<"$out" | head -3 | sed 's/^/               /'
    fails=$((fails+1))
  elif grep -qiE "$PASS_RE" <<<"$out"; then
    printf '%-14s %s\n' "$t" "ok"
  else
    # it said neither - do not guess
    printf '%-14s %s\n' "$t" "UNCLEAR (no pass line)"
    tail -3 <<<"$out" | sed 's/^/               /'
    fails=$((fails+1))
  fi
done
echo
[ "$fails" -eq 0 ] && echo "all green" || echo "$fails failing"
exit $((fails > 0))
