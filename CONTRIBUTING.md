# Contributing to Pitwall

Thanks for helping improve Pitwall. Contributions are welcome — UI, ML, data
pipelines, docs, tests, or race-weekend features.

## Fan-made disclaimer

Pitwall is a **fan-made** project by [Raghav Mehta](https://www.linkedin.com/in/raghavmehta1/).
It has **nothing to do with** Formula 1 commercial entities, the FIA, teams, or
drivers. Do not imply official affiliation in PRs, docs, or marketing copy.

## Ownership and attribution

- Copyright for the original work: **© 2026 Raghav Mehta**
- License: [Apache License 2.0](LICENSE) — see also [NOTICE](NOTICE)
- Redistributions **must retain** copyright, license, and NOTICE attribution
- The **Pitwall** name and brand assets in `web/public/brand/` remain associated
  with this project; do not present forks as the official Pitwall product
- Footer / README credit to Raghav Mehta should stay in the main project

By opening a pull request, you agree that your contribution is licensed under
the same Apache-2.0 terms as the rest of the repository (unless you state
otherwise in the PR).

## How to contribute

1. Fork the repo and create a branch from `main`
2. Keep changes focused (one concern per PR when possible)
3. Run tests before opening a PR:
   - Web: `cd web && npm test`
   - API: `cd api && python -m pytest ../test-suite/api -q`
4. Open a PR describing **what** changed and **why**
5. Prefer small, reviewable diffs over large rewrites

## Local setup

See [README.md](README.md) for API + web quick start and env vars. Never commit
secrets (`.env`, API keys, shared secrets).

## Good first areas

- Predict board UX / calibration docs
- Live / battle view polish
- Tests for BFF routes and ML helpers
- Accessibility and mobile layout
- Docs and contributor onboarding
