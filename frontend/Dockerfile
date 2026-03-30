FROM node:20-bookworm-slim AS builder

WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:3000
ARG VITE_SOCKET_URL=http://localhost:3000

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}

COPY package*.json ./
RUN npm ci \
    && npm install --no-save @rollup/rollup-linux-x64-gnu@$(node -p "require('./node_modules/rollup/package.json').version")

COPY tsconfig.json ./
COPY tsconfig.app.json ./
COPY tsconfig.node.json ./
COPY postcss.config.cjs ./
COPY tailwind.config.ts ./
COPY vite.config.ts ./
COPY index.html ./
COPY public ./public
COPY src ./src

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
