#!/usr/bin/env bash
# From an empty Conduit to the starting state, through its API: alice and bob; alice's two
# articles and bob's one, tagged; bob's comment on alice's first and his favourite on it,
# alice's favourite on bob's; each following the other. Then writes beside this script
# credentials.json, each user's request headers, and seed.sql, the data as it stands, which
# reset.sh reloads.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
API=${CONDUIT_API:-http://localhost:8085/api}

post() { # post TOKEN PATH BODY — fails on a non-2xx status, printing the body
  local out code
  out=$(curl -s -H 'Content-Type: application/json' ${1:+-H "Authorization: Token $1"} -X POST "$API$2" --data "$3" -w '\n%{http_code}')
  code=${out##*$'\n'}
  out=${out%$'\n'*}
  if [[ $code != 2* ]]; then echo "POST $2 -> $code $out" >&2; exit 1; fi
  printf '%s' "$out"
}
token() { sed -E 's/.*"token":"([^"]+)".*/\1/' <<<"$1"; }

ALICE=$(token "$(post "" /users '{"user":{"username":"alice","email":"alice@conduit.test","password":"alice-pw-123"}}')")
BOB=$(token "$(post "" /users '{"user":{"username":"bob","email":"bob@conduit.test","password":"bob-pw-1234"}}')")

post "$ALICE" /articles '{"article":{"title":"How to train your dragon","description":"Ever wonder how?","body":"You have to believe","tagList":["dragons","training"]}}' > /dev/null
post "$ALICE" /articles '{"article":{"title":"Specy in practice","description":"A contract judged live","body":"Write the spec, run it against the target","tagList":["specy"]}}' > /dev/null
post "$BOB"   /articles '{"article":{"title":"Bob on dragons","description":"A reply","body":"Dragons are overrated","tagList":["dragons"]}}' > /dev/null

post "$BOB" /articles/how-to-train-your-dragon/comments '{"comment":{"body":"It worked for me"}}' > /dev/null
post "$BOB" /articles/how-to-train-your-dragon/favorite '' > /dev/null
post "$BOB" /profiles/alice/follow '' > /dev/null
post "$ALICE" /articles/bob-on-dragons/favorite '' > /dev/null
post "$ALICE" /profiles/bob/follow '' > /dev/null

printf '{"alice": {"Authorization": "Token %s"}, "bob": {"Authorization": "Token %s"}}\n' \
  "$ALICE" "$BOB" > "$here/credentials.json"

docker compose -f "$here/compose.yaml" exec -T db \
  pg_dump -U main --data-only --exclude-table=flyway_schema_history main > "$here/seed.sql"
