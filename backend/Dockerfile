# Multi-stage build — context is the jarvis-os/ root (see docker-compose.yml)
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY backend/package.json backend/package.json

RUN npm install --workspaces --if-present --include-workspace-root

COPY packages/shared packages/shared
COPY backend backend

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=backend

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist

EXPOSE 3001
CMD ["node", "backend/dist/index.js"]
