# F1_v1

Formula 1 hub: standings, calendar, results, history, ML race predictions, and an agentic chat assistant.

**Brand:** F1_v1 · **Default theme:** dark · **Chat model:** Llama 3.3 70B (Groq) · **ML:** LightGBM (FastAPI)

Not affiliated with Formula 1 companies. Data via [Jolpica](https://github.com/jolpica/jolpica-f1) and [OpenF1](https://openf1.org/).

### Imagery

Driver headshots, circuit icons, and country flags come from OpenF1 fields that point at the Formula 1 media CDN (`media.formula1.com`). They are hotlinked for fan/educational display, not stored in this repo. F1 trademarks and photos remain property of their owners — do not treat this as an official product or redistribute assets commercially without a license.

## Learning pillars

| Pillar | Where |
|---|---|
| Development | `web/` Next.js + `api/` FastAPI |
| GenAI / Agentic AI | `/chat` UI → `/api/chat` → FastAPI RAG (Chroma + official FIA PDFs) + Groq Llama 3.3 70B |
| ML | `api/ml/` train → serve `/predict` (Phase 3) |
| DevOps | Docker Compose, GitHub Actions, deploy |

See [LEARNINGS.md](LEARNINGS.md) for the hands-on journal.

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
- Upstream host allowlist in `web/src/lib/security.ts`
- FastAPI `/predict` requires `X-ML-Secret`
- Rate limits on `/api/predict` (and chat when added)

## Repo layout

```text
web/     Next.js App Router UI + BFF routes
api/     FastAPI ML service
.github/workflows/ci.yml
docker-compose.yml
```

## Status

- [x] Phase 0 — Setup, theme, CI, Docker
- [x] Phase 1 — Core season (calendar, standings, race, profiles)
- [x] Phase 2 — History season index
- [x] Imagery — OpenF1 headshots, circuits, flags
- [x] Phase 5 — OpenF1 live / replay leaderboard
- [ ] Phase 6 — Production deploy
- [x] Phase 4 — Agentic chat (Groq + Chroma over official FIA regs + Jolpica tools)
- [ ] Phase 3 — LightGBM predictions **(on hold — last)**

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

### Web (Vercel)

```bash
cd web
npx vercel          # first time: link project
npx vercel --prod
```

Set env in Vercel: `ML_API_URL`, `ML_SHARED_SECRET`, `GROQ_API_KEY` (when chat ships).

### API (Railway / Fly)

```bash
cd api
# example: fly launch && fly secrets set ML_SHARED_SECRET=...
```

Point `ML_API_URL` on Vercel at the public API URL.
