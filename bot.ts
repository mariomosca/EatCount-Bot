import { startTelegramBot } from './src/index.js';
import { startApiServer } from './src/api/index.js';
import { initDb } from './src/lib/db.js';
import { config } from './envconfig.js';

// Initialize database
const db = initDb();

// Start Telegram bot first so we can wire the bot instance into API debug routes
const bot = await startTelegramBot(config.telegram.botToken, db);

// Start API server (for MCP integration); pass bot to enable /api/debug/* routes
startApiServer(db, bot);
