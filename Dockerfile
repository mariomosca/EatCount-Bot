FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Встановлення typescript глобально для компіляції
RUN npm ci 

COPY . .

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV production

# Expose API port for MCP integration
EXPOSE 3000

# Sync database schema and start bot
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/bot.js"] 