#!/bin/bash
# Runs ON the production VPS as the unprivileged `ci` user, invoked by
# deploy/ci-deploy.sh over ssh. Everything that touches the live box lives here
# so the whole blast radius can be read as one file.
#
# ci's only sudo right is `supervisorctl` on orb-api and orb-web. It cannot read
# /etc/shadow, cannot install packages, and cannot restart anything else.
set -uo pipefail

APPDIR=/var/www/orb
STAGING="$(cd "$(dirname "$0")" && pwd)"
# /var/www itself is root-owned, so the backup cannot live beside the app dir -
# ci has no write permission there. /var/backups/orb is provisioned ci-owned.
BAKDIR=/var/backups/orb/frontend.bak
VERSION="${VERSION:-dev}"
HEALTH=http://127.0.0.1:3000/

say() { echo "    $*"; }

# ---------------------------------------------------------------- preflight --
NEW="$STAGING/output"
test -f "$NEW/server/index.mjs" || { echo "FAILED - no nitro server in $NEW"; exit 1; }
test -d "$NEW/public"           || { echo "FAILED - no public assets in $NEW"; exit 1; }
# A partial rsync would still satisfy the tests above. A real Nuxt build ships
# its server dependencies, so an empty node_modules means a truncated upload.
test -d "$NEW/server/node_modules" || { echo "FAILED - $NEW/server/node_modules missing; upload looks truncated"; exit 1; }
say "build ok ($(du -sh "$NEW" | cut -f1), version $VERSION)"

# ------------------------------------------------------------------- backup --
# One full copy of what is currently live, so a bad release can be undone
# without a rebuild. Replaced each deploy, so there is exactly one.
rm -rf "$BAKDIR"
# A backup that fails is not a warning, it is a missing rollback path. Refuse to
# touch the live tree without one - the first run of this script proved the point
# by failing the copy on a permissions error and deploying anyway.
if ! cp -a "$APPDIR" "$BAKDIR"; then
  echo "FAILED - could not back up $APPDIR to $BAKDIR; refusing to deploy without a rollback path"
  exit 1
fi
test -f "$BAKDIR/server/index.mjs" || { echo "FAILED - backup at $BAKDIR looks incomplete; refusing to deploy"; exit 1; }
say "previous release backed up to $BAKDIR"

# --------------------------------------------------------------------- swap --
# --delay-updates stages every changed file and renames them at the end, which
# keeps the window where the tree is half-old/half-new down to a rename storm
# rather than the length of the whole transfer.
#
# .env is excluded from --delete and written separately: it is the file the
# build was made against, and it must not be removed by a sync of .output/.
rsync -a --delete --delay-updates --exclude='.env' "$NEW/" "$APPDIR/"
install -m 600 "$STAGING/.env" "$APPDIR/.env"
say "swapped in the new release"

# ------------------------------------------------------------------ restart --
sudo -n /usr/bin/supervisorctl restart orb-web >/dev/null

say "waiting for $HEALTH"
ok=0
for i in $(seq 1 30); do
  if [ "$(curl -s -m 3 -o /dev/null -w '%{http_code}' "$HEALTH")" = "200" ]; then
    ok=1; say "healthy after ${i}s"; break
  fi
  sleep 1
done

# ----------------------------------------------------------------- rollback --
if [ "$ok" != "1" ]; then
  echo "FAILED - the frontend did not answer $HEALTH within 30s; rolling back"
  if [ -f "$BAKDIR/server/index.mjs" ]; then
    rsync -a --delete "$BAKDIR/" "$APPDIR/"
    sudo -n /usr/bin/supervisorctl restart orb-web >/dev/null
    sleep 8
    echo "    rollback health: $(curl -s -m 3 -o /dev/null -w '%{http_code}' "$HEALTH")"
  else
    echo "    no backup to roll back to - MANUAL INTERVENTION NEEDED"
  fi
  echo "--- last 30 lines of the frontend log ---"
  tail -30 /var/log/supervisor/orb-web-error.log 2>/dev/null
  exit 1
fi

rm -rf "$STAGING"
echo "==> orb $VERSION is live"
