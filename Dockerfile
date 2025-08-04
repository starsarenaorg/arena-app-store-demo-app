FROM node:20.18.0-alpine AS base

WORKDIR /app
COPY . .

RUN npm ci

CMD ["npm", "run", "dev"]
