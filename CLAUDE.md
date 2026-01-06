# Diet Logger (EatCount Bot)

Telegram bot per tracking nutrizionale con AI.

## Quick Info

| Key | Value |
|-----|-------|
| Tipo | Personal Tool |
| Stack | TypeScript, Grammy, Prisma, Hono, OpenAI |
| DB | PostgreSQL |
| Deploy | Railway |
| Porta API | 3000 (default) |

## Project Structure

```
diet-logger/
├── bot.ts              # Entry point
├── envconfig.ts        # Environment config
├── src/
│   ├── index.ts        # Bot + API startup
│   ├── api/            # REST API (Hono)
│   │   ├── index.ts    # API server setup
│   │   └── routes/     # meals, summary, target
│   ├── handlers/       # Telegram handlers
│   ├── menus/          # Telegram keyboards/menus
│   ├── lib/            # Core services (DB, OpenAI, Logger)
│   ├── helpers/        # Utility functions
│   └── middlewares/    # Session middleware
├── mcp-server/         # MCP server per Claude integration
│   ├── index.ts        # MCP tools implementation
│   └── package.json    # Separate deps
└── prisma/
    └── schema.prisma   # DB schema
```

## Development Commands

```bash
# Dev mode (hot reload)
npm run dev

# Build
npm run build

# Production
npm start

# DB operations
npx prisma generate
npx prisma db push
npx prisma studio
```

## MCP Server

Standalone MCP server in `mcp-server/` per integrare con Claude.

```bash
cd mcp-server
npm install
npm run dev  # Development
npm start    # Production
```

**Tools disponibili:**
- `get_meals` - Recupera pasti per data/range
- `get_daily_summary` - Sommario giornaliero
- `get_weekly_summary` - Sommario settimanale
- `get_target` / `set_target` - Gestione target calorie
- `add_meal` - Aggiunge pasto
- `delete_meal` - Elimina pasto

**Config MCP** (in `~/.config/claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "diet-logger": {
      "command": "node",
      "args": ["/path/to/diet-logger/mcp-server/dist/index.js"],
      "env": {
        "DIET_API_URL": "http://localhost:3000",
        "DIET_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Environment Variables

```bash
NODE_ENV=development
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=xxx      # IMPORTANTE: usa bot diverso per dev!
OPENAI_API_KEY=xxx
FAT_SECRET_CLIENT_ID=xxx    # Optional
FAT_SECRET_SECRET=xxx       # Optional
API_PORT=3000               # Optional, default 3000
API_KEY=xxx                 # Optional, for MCP auth
```

## Dev vs Prod

**IMPORTANTE:** Usa un bot Telegram separato per development.

1. Crea bot dev su @BotFather (es. `eatcount_dev_bot`)
2. Usa quel token nel `.env` locale
3. Prod usa token diverso (configurato su Railway)

Questo evita conflitti quando dev e prod girano contemporaneamente.

## Data Model

**User** -> ha -> **Meals** -> contiene -> **MealItems**
**User** -> ha -> **Target** (calorie giornaliere)

MealTypes: BREAKFAST, LUNCH, DINNER, SNACK

## API Endpoints

```
GET  /health           - Health check
GET  /api/meals        - Lista pasti (query: date, startDate, endDate, mealType)
POST /api/meals        - Aggiungi pasto
DELETE /api/meals/:id  - Elimina pasto
GET  /api/summary/daily   - Sommario giornaliero
GET  /api/summary/weekly  - Sommario settimanale
GET  /api/target       - Get target
PUT  /api/target       - Set target
```

Header auth: `X-API-Key: <API_KEY>`

## Notes

- Bot telegram usa Grammy framework
- AI analizza descrizione pasti in linguaggio naturale
- FatSecret API per database nutrizionale
- OpenAI per parsing descrizioni pasti
- MCP server comunica via REST API (non direct DB)
