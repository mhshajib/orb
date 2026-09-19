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
# $HOME is not guaranteed to be set in a CI container, and `~` would then expand
# to nothing and silently put these under /.ssh.
SSH_DIR="${HOME:-/root}/.ssh"
KEY="$SSH_DIR/id_ed25519"
mkdir -p "$SSH_DIR" && chmod 700 "$SSH_DIR"

# busybox wget does NOT create the -O file when the fetch fails, so the old
# `wget || true` followed by `chmod 600` died on the chmod under `set -e` -
# before the error message below could ever run. That produced a red build with
# an empty log. Every failure from here on has to say what it was.
if ! wget -qO "$KEY" "$CONSUL/v1/kv/apps/$APP/$ENV/deploy_key?raw"; then
  echo "FAILED - could not fetch apps/$APP/$ENV/deploy_key from $CONSUL"
  if wget -qO- "$CONSUL/v1/status/leader" >/dev/null 2>&1; then
    echo "        consul IS reachable from this container, so that key is missing or unreadable"
  else
    echo "        consul at $CONSUL is NOT reachable from this container"
    echo "        (the build step reaches it too - if that one worked and this did not,"
    echo "         the two steps are not on the same network)"
  fi
  exit 1
fi
if [ ! -s "$KEY" ]; then
  echo "FAILED - the deploy key at apps/$APP/$ENV/deploy_key is empty"
  exit 1
fi
chmod 600 "$KEY"
echo "    key ok ($(wc -c < "$KEY") bytes)"

echo "==> recording the host key for $DEPLOY_HOST"
# ssh-keyscan is the other silent killer: it exits non-zero when it cannot reach
# port 22, and with `set -e` that ended the script with no output at all.
if ! ssh-keyscan -H "$DEPLOY_HOST" >> "$SSH_DIR/known_hosts" 2>/dev/null; then
  echo "FAILED - ssh-keyscan could not reach $DEPLOY_HOST:22 from this container"
  exit 1
fi
if [ ! -s "$SSH_DIR/known_hosts" ]; then
  echo "FAILED - ssh-keyscan returned no host key for $DEPLOY_HOST"
  exit 1
fi

echo "==> checking ssh access as $DEPLOY_USER"
if ! ssh -i "$KEY" -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=15 "$HOST" "echo ok" >/dev/null 2>&1; then
  echo "FAILED - cannot ssh to $HOST using the deploy key from consul"
  echo "        check that the public half is in ~ci/.ssh/authorized_keys on $DEPLOY_HOST"
  exit 1
fi
echo "    ssh ok"

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
