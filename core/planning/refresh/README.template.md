# Refresh Control

Zhulong uses this directory for lightweight freshness reminders and explicit refresh records.

Generated files:

- `REFRESH_STATE.json`: last successful GraphRAG / Graphify refresh commit.
- `PREFLIGHT.md`: lightweight reminder, no heavy refresh.
- `REFRESH_PLAN.md`: recommended differential refresh actions.
- `REFRESH_RUN.md`: explicit refresh execution evidence.

Rule: ordinary workflow commands may read this directory, but they must not rebuild GraphRAG or Graphify automatically.
