import { startTelegramBot } from './src/index.js';
import { startApiServer } from './src/api/index.js';
import { initDb } from './src/lib/db.js';
import { config } from './envconfig.js';

// Initialize database
const db = initDb();

// Start API server (for MCP integration)
startApiServer(db);

// Start Telegram bot
await startTelegramBot(config.telegram.botToken);
