FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN ./rebuild_api.sh

FROM scratch AS export
COPY --from=builder /app/dist /
