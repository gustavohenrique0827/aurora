# Multi-stage build — context is the jarvis-os/ root (see docker-compose.yml)
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY frontend/package.json frontend/package.json

RUN npm install --workspaces --if-present --include-workspace-root

COPY packages/shared packages/shared
COPY frontend frontend

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=frontend

FROM nginx:alpine AS production
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
