# Pitwall test suite

Feature-oriented tests for the Next.js web app and FastAPI service.

```text
test-suite/
  web/          Vitest — libs, BFF routes, feature helpers
  api/          Pytest — health, auth, predict, chat schemas/cache
```

## Run

```bash
# Web (Vitest config in web/vitest.config.ts, cases in this folder)
cd web && npm test

# API
cd api && pip install -r requirements.txt -r requirements-dev.txt
python -m pytest ../test-suite/api -q
```

## Feature map

| Feature | Module | Tests |
|---|---|---|
| Season / ID validation | `lib/security/validation` | `web/unit/validation.test.ts` |
| SSRF allowlist + rate limit | `lib/security` | `web/unit/security.test.ts` |
| Cloudinary / media URLs | `lib/media` | `web/unit/media.test.ts` |
| Team stage colors | `lib/media/team-colors` | `web/unit/team-colors.test.ts` |
| Race weekend schedule slots | `lib/data/race-sessions` | `web/unit/race-sessions.test.ts` |
| Live session status / priority / ranking modes | `lib/data/openf1-live` | `web/unit/openf1-live.test.ts` |
| Upstream TTL / 429 stale | `lib/data/upstream-cache` | `web/unit/upstream-cache.test.ts` |
| Chat prompt quota + owner unlock | `lib/security/chat-quota` | `web/unit/chat-quota.test.ts` |
| Web health | `app/api/health` | `web/routes/health.test.ts` |
| Chat ingest disabled on web | `app/api/chat/ingest` | `web/routes/chat-ingest.test.ts` |
| Chat owner unlock route | `app/api/chat/unlock` | `web/routes/chat-unlock.test.ts` |
| API health | `app.main` | `api/test_health.py` |
| Shared-secret auth | `app.core.auth` | `api/test_auth.py` |
| Predict stub | `app.predict` | `api/test_predict.py` |
| Chat request schemas | `app.schemas` | `api/test_chat_schemas.py` |
| Knowledge status | `app.chat` | `api/test_knowledge.py` |
| Chat TTL cache | `app.chat.cache` | `api/test_chat_cache.py` |
