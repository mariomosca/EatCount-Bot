import 'dotenv/config';

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[ENV] Environment variable ${name} is required but not set.`
    );
  }
  return value;
};

const optionalEnv = (name: string): string => {
  return process.env[name] || '';
};

export const config = {
  server: {
    nodeEnv: requireEnv('NODE_ENV'),
    apiPort: parseInt(process.env.API_PORT || '3000', 10),
  },
  api: {
    key: optionalEnv('API_KEY'),
  },
  db: {
    url: requireEnv('DATABASE_URL'),
  },
  telegram: {
    botToken: requireEnv('TELEGRAM_BOT_TOKEN'),
  },
  openai: {
    apiKey: requireEnv('OPENAI_API_KEY'),
  },
  fatSecret: {
    clientId: optionalEnv('FAT_SECRET_CLIENT_ID'),
    clientSecret: optionalEnv('FAT_SECRET_SECRET'),
  },
  usda: {
    apiKey: optionalEnv('USDA_API_KEY'),
  },
};
