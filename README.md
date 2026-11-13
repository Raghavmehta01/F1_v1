# Pitwall

Formula 1 hub: standings, calendar, results, history, ML race predictions, and an agentic chat assistant.

**Brand:** Pitwall · **Creator:** [Raghav Mehta](https://www.linkedin.com/in/raghavmehta1/) · **Default theme:** dark · **Chat model:** Llama 3.3 70B (Groq) · **ML:** LightGBM (FastAPI)

## Fan-made / unofficial

**Pitwall is a fan-made, independent open-source project.**  
It has **nothing to do with** Formula 1 commercial entities, the FIA, teams, or drivers. Not affiliated with, endorsed by, sponsored by, or associated with any of them. Data via [Jolpica](https://github.com/jolpica/jolpica-f1) and [OpenF1](https://openf1.org/).

## License & attribution

© 2026 Raghav Mehta. Licensed under the [Apache License 2.0](LICENSE).  
Attribution and redistributor obligations are in [NOTICE](NOTICE). Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

### Imagery

Official driver / team / car graphics are fetched from the Formula 1 media CDN (`media.formula1.com` via Cloudinary URL helpers in `web/src/lib/media.ts`). Do not bulk-download them into git or blob storage — keep site-owned assets only in `web/public/` (hero pack, radio sting, UI logos). F1 trademarks and photos remain property of their owners. FIA regulations remain © FIA.

## Learning pillars

| Pillar | Where |
|---|---|
| Development | `web/` Next.js + `api/` FastAPI |
| GenAI / Agentic AI | `/chat` UI → `/api/chat` → FastAPI RAG (Chroma + official FIA PDFs) + Groq Llama 3.3 70B |
| ML | `api/ml/` LightGBM (+ heuristic fallback) → `/predict` |
| DevOps | Docker Compose, GitHub Actions, deploy |

See [LEARNINGS.md](LEARNINGS.md) for the hands-on journal.

## Tests

Feature suite lives in [`test-suite/`](test-suite/README.md).

```bash
# Web (Vitest)
cd web && npm test

# API (Pytest)
cd api && pip install -r requirements-dev.txt && python -m pytest ../test-suite/api -q
```

## Quick start (local)

```bash
# API
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env   # set ML_SHARED_SECRET
uvicorn app.main:app --reload --port 8000

# Web (new terminal)
cd web
cp ../.env.example .env.local   # set ML_SHARED_SECRET to match
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Docker Compose

```bash
export ML_SHARED_SECRET=dev-shared-secret
docker compose up --build
```

## Security notes

- Secrets stay in env — never commit `.env`
- Upstream host allowlist in `web/src/lib/security.ts` (auto-allows `ML_API_URL` host; add more via `ALLOWED_UPSTREAM_HOSTS`)
- FastAPI `/predict` and `/chat` require `X-ML-Secret`
- Burst rate limits on `/api/predict` and `/api/chat`
- Chat visitors: **5 prompts** (configurable `CHAT_PROMPTS_LIMIT`). Owner unlimited via `CHAT_OWNER_TOKEN`

## Repo layout

```text
web/          Next.js App Router UI + BFF routes
  src/app/           pages + /api BFF
  src/components/    layout · home · standings · race · live · chat · ui
  src/lib/           data · media · security
api/          FastAPI — core · chat · predict
test-suite/   Feature tests (Vitest + Pytest)
STRUCTURE.md  Module map
.github/workflows/ci.yml
docker-compose.yml
```

## Status

- [x] Phase 0 — Setup, theme, CI, Docker
- [x] Phase 1 — Core season (calendar, standings, race, profiles)
- [x] Phase 2 — History season index
- [x] Imagery — OpenF1 headshots, circuits, flags
- [x] Phase 5 — OpenF1 live / replay leaderboard
- [x] Phase 6 — Production deploy readiness (Docker, env, chat quota, allowlist)
- [x] Phase 4 — Agentic chat (Groq + Chroma over official FIA regs + Jolpica tools)
- [x] Phase 3 — LightGBM / heuristic race predictions (`python -m ml.train`)

### Chat knowledge (official FIA only)

```bash
cd api && source .venv/bin/activate
pip install -r requirements.txt
# set GROQ_API_KEY in api/.env
python -m scripts.ingest_official
uvicorn app.main:app --reload --port 8000
```

Sources: FIA 2026 Sections A–F + International Sporting Code (see `api/knowledge/SOURCES.md`).

## Deploy

### Checklist

1. Ingest FIA knowledge once on the API host: `python -m scripts.ingest_official` (persist `api/data/chroma`).
2. Deploy API (Railway / Fly / Compose) with secrets below.
3. Deploy web (Vercel or Compose) with matching `ML_SHARED_SECRET` and public `ML_API_URL` (`https://…`).
4. Set `CORS_ORIGINS` on the API to your web origin.
5. Unlock owner chat: open `https://your-site/chat?owner=YOUR_CHAT_OWNER_TOKEN` once.

### Web (Vercel)

```bash
cd web
npx vercel          # first time: link project
npx vercel --prod
```

Vercel env:

| Variable | Required | Notes |
|---|---|---|
| `ML_API_URL` | yes | Public HTTPS URL of FastAPI |
| `ML_SHARED_SECRET` | yes | Same value as API |
| `CHAT_OWNER_TOKEN` | yes | Your unlimited unlock token |
| `CHAT_PROMPTS_LIMIT` | no | Default `5` |
| `ALLOWED_UPSTREAM_HOSTS` | no | Usually unnecessary — `ML_API_URL` host is auto-allowed |
| `OPENF1_USERNAME` / `OPENF1_PASSWORD` | no | Live timing auth |

### API (Railway / Fly)

```bash
cd api
# example: fly launch && fly secrets set ML_SHARED_SECRET=... GROQ_API_KEY=... CORS_ORIGINS=https://your-app.vercel.app
```

API env: `ML_SHARED_SECRET`, `GROQ_API_KEY`, `GROQ_MODEL`, `CORS_ORIGINS`, and a persistent volume for `data/chroma` + `knowledge/official`.

### Race predictions (ML)

```bash
cd api
python -m ml.train --start 2019 --end 2025   # writes ml/artifacts/model.joblib
```

`/predict` uses LightGBM when the artifact exists; otherwise a standings/form **heuristic** so the Predict page still works on fresh deploys.

### Chat quota (owner unlimited)

Visitors get `CHAT_PROMPTS_LIMIT` successful prompts (signed cookie + soft IP backup).  
You get unlimited after unlocking with `CHAT_OWNER_TOKEN`:

```text
/chat?owner=<CHAT_OWNER_TOKEN>
```

That sets an httpOnly owner cookie for the browser (token also stored in localStorage for the header). Do not share the token.
