FROM node:22-bookworm-slim AS build

WORKDIR /app

ARG VITE_API_BASE_URL=/api
ARG VITE_SOCKET_URL=

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}

COPY package.json package-lock.json ./
RUN npm ci --include=optional --no-audit --no-fund \
    && ROLLUP_VERSION=$(node -e "process.stdout.write(require('./node_modules/rollup/package.json').version)") \
    && npm install --no-save --no-audit --no-fund @rollup/rollup-linux-x64-gnu@$ROLLUP_VERSION

COPY . .

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
