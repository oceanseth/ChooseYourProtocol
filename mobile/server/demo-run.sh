#!/usr/bin/env bash
# Reproduce the StackMax v3.2 backend end-to-end (managing agent + vision-ready).
set -e
PORT=${PORT:-8787}; SECRET=${STACKMAX_SEED_SECRET:-dev-seed-secret}
B="http://localhost:$PORT"
echo "Server should be running: node server/index.js (PORT=$PORT STACKMAX_SEED_SECRET=$SECRET)"
GID=$(curl -s -X POST $B/resolve -H 'Content-Type: application/json' -d '{"goal":"clear skin","creator_name":"You"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
MP=$(curl -s "$B/groups/$GID" | python3 -c "import sys,json;print([m['id'] for m in json.load(sys.stdin)['metrics'] if 'pimple' in m['canonical_key']][0])")
echo "group=$GID metric=$MP"
echo "-> seed via Kylord's skincare-seed-payload.json (POST /groups/$GID/seed with x-seed-secret)"
echo "-> announce a group win:   POST /groups/$GID/check-in {auto_win_for_member:<syn>,metric_id:$MP,audience:group}"
echo "-> 1:1 nudge to a member:   POST /groups/$GID/check-in {type:check_in,audience:user,target_member_id:<usr>,action:{kind:capture}}"
echo "-> read shared feed:        GET  /groups/$GID/feed?audience=group"
echo "-> read a member 1:1 lane:  GET  /groups/$GID/feed?audience=user&as=<usr>"
