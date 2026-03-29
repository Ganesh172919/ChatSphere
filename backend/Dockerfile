FROM node:20-alpine

WORKDIR /app

# Needed only during image build for prisma generate.
ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatsphere?schema=public"
ENV DATABASE_URL=${DATABASE_URL}

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY src ./src
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN npm run build \
    && mkdir -p /app/uploads \
    && chmod +x /app/docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
