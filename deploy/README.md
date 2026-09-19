# Deploying the Orb frontend

This is the tree that builds the frontend serving **orb.bd**. It runs as a Nuxt 3
SSR process (not a static upload) on the Linode VPS `172.104.59.12`, under
supervisor, behind nginx.

```
  Internet ──► nginx (orb.bd, Let's Encrypt) ──► 127.0.0.1:3000  orb-web (node)
                                                      │ /api/*  and /platform/api/*
                                                      ▼  proxied server-side
                                                 api.orb.bd
```

Drone builds; the VPS only receives the finished `.output`. That box has 2 GB of
RAM and serves live traffic, so a Nuxt build must never run there.

## Not to be confused with github.com/mhshajib/orb_old

`orb_old` is a Nuxt 4 + shadcn **rewrite** that was never deployed. It has
Google OAuth this tree does not, and it is missing the whole platform/staff
console this tree has (10 pages, 5 server routes, ~3,700 lines). Its pipeline is
disabled so it cannot reach production.

**This** repo owns the live site. It is the tree that was previously called
`orb-new` locally and was deployed by hand; the naming was straightened out on
2026-09-19 so that the repo named `orb` is the one actually serving orb.bd.

## What is where

| Thing | Location |
|---|---|
| Pipeline | `.drone.yml` |
| CI-side deploy | `deploy/ci-deploy.sh` |
| Server-side deploy | `deploy/remote-deploy.sh` — runs on the VPS as `ci` |
| Build config | Consul KV `apps/orb/prod/.env` |
| Deploy key | Consul KV `apps/orb/prod/deploy_key` |
| App root | `/var/www/orb` (the *contents* of `.output`, plus `.env`) |
| Previous release | `/var/backups/orb/frontend.bak` |
| supervisor | `/etc/supervisor/conf.d/orb-web.conf` · copy in `deploy/orb-web.conf` |
| vhost | `/etc/nginx/sites-available/orb.bd` · copy in `deploy/nginx-orb.bd.conf` |

## `.env` is load-bearing at build time

`nuxt.config.ts` defaults `apiBase` to `http://localhost:8080` and `wsBase` to
`ws://localhost:8080/ws`. Those are **dev** defaults, so a build that does not
get `.env` would ship an app pointing at nothing. The pipeline therefore fails
hard when Consul returns an empty `.env`, and additionally refuses to build if
`NUXT_API_BASE` is not an https URL.

It also asserts the platform console routes exist in the output, so a build that
silently stops producing them fails instead of shipping.

## How a deploy runs

Push to `main` → build in `node:20-alpine` (matching the server's node v20.20.0)
with `npm ci` → upload `.output` to `/home/ci/staging/orb` → `remote-deploy.sh`
backs up the running release, rsyncs the new one in with `--delay-updates`,
restarts supervisor and polls `:3000`. Anything not answering 200 within 30s is
**rolled back automatically**.

## Rolling back by hand

```bash
ssh ci@172.104.59.12
rsync -a --delete /var/backups/orb/frontend.bak/ /var/www/orb/
sudo supervisorctl restart orb-web
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
```
