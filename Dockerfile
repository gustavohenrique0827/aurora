# API (Express + Socket.io). Contexto: raiz do jarvis-os (ver docker-compose.yml)
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY shared shared
COPY server server
COPY tsconfig.server.json ./
RUN npm run build:server

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist-server ./dist-server
EXPOSE 3001
CMD ["node", "dist-server/index.cjs"]
