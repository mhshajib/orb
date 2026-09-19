#!/bin/sh
# Ship the Orb frontend (Nuxt 4 / Nitro SSR) to the production VPS. Run by
# .drone.yml inside an alpine container that has openssh-client and rsync.
#
# This lives in a script rather than inline in .drone.yml for a concrete reason:
# a YAML plain scalar containing ": " parses as a MAP, not a string, so an
# `echo "ERROR: ..."` inside an inline command silently turns that step into
# something Drone cannot unmarshal. Shell belongs in a shell file, where it can
# also be syntax-checked before it ever reaches CI.
#
# POSIX sh only - the alpine image has no bash.
#
# The build happens HERE, not on the server: the VPS has 2 GB of RAM and is
# serving live traffic, and a Nuxt build would contend with it for memory.
set -eu

CONSUL="${CONSUL:-http://192.168.68.117:8500}"
APP="${APP:-orb}"
DEPLOY_HOST="${DEPLOY_HOST:-172.104.59.12}"
DEPLOY_USER="${DEPLOY_USER:-ci}"
HOST="$DEPLOY_USER@$DEPLOY_HOST"
STAGING="/home/$DEPLOY_USER/staging/$APP"
VERSION="${DRONE_COMMIT_SHA:-dev}"

ENV=prod
case "${DRONE_BRANCH:-main}" in
  stage|staging)           ENV=stage ;;
  dev|develop|development) ENV=dev ;;
esac
echo "==> deploying $APP to $DEPLOY_HOST (env=$ENV, version=$VERSION)"

test -f .output/server/index.mjs || { echo "FAILED - no build output; did the build step run?"; exit 1; }

echo "==> fetching deploy key from consul"
mkdir -p ~/.ssh && chmod 700 ~/.ssh
wget -qO ~/.ssh/id_ed25519 "$CONSUL/v1/kv/apps/$APP/$ENV/deploy_key?raw" || true
chmod 600 ~/.ssh/id_ed25519
if [ ! -s ~/.ssh/id_ed25519 ]; then
  echo "FAILED - missing deploy key in consul at apps/$APP/$ENV/deploy_key"
  exit 1
fi
ssh-keyscan -H "$DEPLOY_HOST" >> ~/.ssh/known_hosts 2>/dev/null

# The build step already wrote .env from Consul. Ship that same file so the
# server copy never drifts from what the bundle was built against.
test -s .env || { echo "FAILED - .env missing; the build step should have written it"; exit 1; }

echo "==> uploading build to $STAGING"
ssh "$HOST" "mkdir -p $STAGING && chmod 700 $STAGING"
# Trailing slash on .output/ so the CONTENTS land in output/ - /var/www/orb holds
# the contents of .output, not a nested .output directory.
rsync -az --delete .output/                    "$HOST:$STAGING/output/"
rsync -az --chmod=F600 .env                    "$HOST:$STAGING/.env"
rsync -az --chmod=F700 deploy/remote-deploy.sh "$HOST:$STAGING/remote-deploy.sh"

# Everything that touches the live box - the backup, the swap, the restart and
# the rollback - is in remote-deploy.sh so it can be read as one file. It runs
# as the unprivileged ci user, whose only sudo right is `supervisorctl` on the
# two orb programs.
echo "==> running remote deploy"
ssh "$HOST" "VERSION=$VERSION $STAGING/remote-deploy.sh"
