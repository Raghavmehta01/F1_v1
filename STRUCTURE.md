# Codebase structure

Light domain layout — pages stay in App Router; logic and UI group by feature.

## Web (`web/src`)

```text
app/                 Next.js routes + BFF (/api/*)
components/
  layout/            Shell: header, footer, theme, intro audio
  home/              Landing hero, strip, weekend times
  standings/         Tables, stage cards, avatars
  race/              Results, weekend tabs, circuits
  live/              Timing board
  chat/              Pit Wall UI
  ui/                Shared primitives (SafeImage, loader)
lib/
  data/              Jolpica, OpenF1, news, types, caches
  media/             Cloudinary URLs, team colors, track SVGs
  security/          Allowlist, validation, chat quota
```

Import examples:

- `@/lib/data/jolpica`
- `@/lib/media` / `@/lib/media/team-colors`
- `@/lib/security` / `@/lib/security/chat-quota`
- `@/components/home/HeroPack`

## API (`api/app`)

```text
main.py              App factory, CORS, health
core/                Shared auth (X-ML-Secret)
chat/                RAG agent, tools, ingest, Chroma
predict/             LightGBM stub routes
schemas.py           Pydantic models
```

## Tests (`test-suite/`)

Mirrors features — see `test-suite/README.md`.
