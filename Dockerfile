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

# Wait for internal network, then sync database and start bot
CMD ["sh", "-c", "sleep 5 && npx prisma db push --skip-generate && node dist/bot.js"] 