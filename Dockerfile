FROM node:18-alpine AS base
WORKDIR /usr/src/app
# Install openssl for Prisma's query engine on Alpine Linux
RUN apk add --no-cache openssl

# Dependencies stage
FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install
# Copy Prisma schema
COPY prisma ./prisma/
# Generate Prisma Client
RUN npx prisma generate

# Build stage
FROM base AS build
RUN npm install -g pnpm
# Copy dependencies from previous stage
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Release stage
FROM base AS release
RUN npm install -g pnpm
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY --from=dependencies /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/dist ./dist
COPY package.json ./

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
