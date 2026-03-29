FROM node:22-alpine AS build

WORKDIR /app

ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/chatsphere?schema=public
ENV DATABASE_URL=${DATABASE_URL}

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY tsconfig.json ./tsconfig.json

RUN npm ci

COPY src ./src

RUN npm run prisma:generate && npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "npm run db:push && npm run start"]
