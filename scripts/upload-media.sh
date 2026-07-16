#!/bin/bash
# Upload large media (not committed to git) to the site bucket under media/.
# The deploy workflow's `s3 sync --delete` excludes media/* so these survive deploys.
# Usage: bash scripts/upload-media.sh
set -euo pipefail
cd "$(dirname "$0")/.."

BUCKET=chooseyourprotocol.com
SRC=media-src/world

aws s3 cp "$SRC/about_film_narrated.mp4" "s3://$BUCKET/media/about-film.mp4" \
  --content-type video/mp4 --cache-control "public,max-age=86400"
aws s3 cp "$SRC/about-film-poster.jpg" "s3://$BUCKET/media/about-film-poster.jpg" \
  --content-type image/jpeg --cache-control "public,max-age=86400"

DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, 'chooseyourprotocol.com')].Id | [0]" \
  --output text)
if [ "$DIST_ID" != "None" ] && [ -n "$DIST_ID" ]; then
  aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/media/*" >/dev/null
  echo "Invalidated /media/* on $DIST_ID"
fi
echo "Done: https://chooseyourprotocol.com/media/about-film.mp4"
