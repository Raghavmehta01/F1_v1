# Pitwall — Learnings journal

Hands-on notes per phase. Add what you built, what broke, and what you’d change.

## Phase 0 — Setup (Dev + DevOps)

**Practiced:** monorepo layout (`web/` + `api/`), env hygiene, CSS theme tokens + dark default, host allowlist, Docker Compose, GitHub Actions CI skeleton.

**Built:** Next.js App Router shell with Pitwall branding, FastAPI health + stub `/predict` behind shared secret, security helpers, CI workflow.

**Notes:**
- Jolpica requires a custom `User-Agent` — without it requests can fail.
- Theme uses `data-theme` on `<html>` so light/dark share one token set.
- FastAPI must not be public without `X-ML-Secret`.

## Phase 1 — Core season (Development)

**Practiced:** typed Jolpica client, server components, standings/calendar/race tables, constructor accent as data (not chrome).

**Built:** Home hero, calendar, standings, race + qualifying, driver/constructor/circuit profiles, BFF API routes.

### Imagery layer

**Practiced:** OpenF1 `drivers` + `meetings` media fields, Next.js `images.remotePatterns`, matching Jolpica IDs to OpenF1 acronyms/names.

**Built:** `DriverAvatar`, `CircuitThumb`, headshots on standings/results/driver pages, circuit art + flags on home/calendar/race.

**Note:** Headshots/circuit art URLs live on `media.formula1.com` via OpenF1 — fan display only; not redistributed in-repo.

## Phase 2 — History

**Practiced:** season archive listing with deep links into standings.

**Built:** `/history` season grid.

## Phase 3 — ML

**Practiced:** Jolpica historical features (form, circuit, team, grid proxy), LightGBM regressor + heuristic fallback, train script, Predict UI.

**Built:** `api/ml/*`, `app/predict/service.py`, `/predict` live board, `python -m ml.train`.

## Phase 4 — GenAI / Agentic

**Practiced:** Chroma RAG over **official FIA PDFs only** (download + pypdf chunk + cite section/issue/page), Groq Llama 3.3 70B tool loop, Jolpica live standings/results tools, Next BFF rate limit.

**Built:** `api/app/chat/*`, `scripts.ingest_official`, `/chat` UI + `/api/chat`, knowledge status + ingest endpoints.

**Rule:** No fan-wiki paraphrases as authority — corpus = FIA published regs from fia.com.

## Phase 5 — Live

**Practiced:** OpenF1 `position` + `intervals` snapshots, live vs replay window (±30 min), client polling, payload trimming with `date>=` filters.

**Built:** `/live` board, `/api/live`, `/api/live/sessions`, session picker, headshots on timing rows.

## Phase 6 — Ship

**Practiced:** loading/error/404 polish, deploy docs, git push + Vercel/API host.

## Phase 4 — Chat (deferred)

Still todo after ship.
