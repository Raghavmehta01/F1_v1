# Official F1 regulation sources

All rule text ingested into Chroma comes from **FIA-published PDFs** only.
Do not add fan wikis or paraphrased rule sheets as primary authority.

Hub: https://www.fia.com/regulation/category/2182  
F1 sport index: https://www.fia.com/regulations/sport/formula-1

## Active corpus (download via `python -m scripts.ingest_official`)

| Doc | Section | Issue | Publisher |
|---|---|---|---|
| General Provisions | A | Iss 03 · 2026-06-25 | FIA |
| Sporting Regulations | B | Iss 09 · 2026-10-01 | FIA |
| Technical Regulations | C | Iss 21 · 2026-10-19 | FIA |
| Financial (Teams) | D | Iss 08 · 2026-10-01 | FIA |
| Financial (PU Manufacturers) | E | Iss 07 · 2026-10-19 | FIA |
| Operational Regulations | F | Iss 11 · 2026-10-01 | FIA |
| International Sporting Code | ISC | 2025 FR-EN clean | FIA |

PDFs are cached under `knowledge/official/` (gitignored). Re-run ingest after FIA publishes a newer issue.

**Disclaimer:** FIA documents remain © FIA. This project stores them locally for educational RAG only and cites article/source metadata in answers. The definitive text is always the current English PDF on fia.com.
