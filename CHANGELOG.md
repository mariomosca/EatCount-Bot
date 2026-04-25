# Changelog

## 2026-04-25

### feat(web): edit past days compliance from history heatmap
- Heatmap tile dei giorni passati in `/history` ora cliccabili (button con focus ring + aria-pressed).
- Click apre editor inline con `MealComplianceGrid` per i 5 slot pasto → `POST /api/compliance/meal` con `{slot, status, date}`.
- Mutation invalida `['compliance']` → heatmap e dashboard si aggiornano in tempo reale.
- I giorni futuri restano non cliccabili.
- Commit: `4bab405`
- File: `web/app/history/HistoryClient.tsx`, `web/components/compliance/HeatmapGrid.tsx`
- Verificato in prod su Railway dopo auto-deploy.

### Note tecniche
- Backend `/api/compliance` e `/api/compliance/meal` già accettavano param `date` (YYYY-MM-DD): nessuna modifica server-side necessaria.
- API client (`lib/api.ts`) aveva già `date?: string` nel payload di `log` e `logMeal`.
- MCP DietLogger CLI / skill: discusso ma rimandato (mcp-server esiste in repo ma non registrato in Claude Code CLI).
