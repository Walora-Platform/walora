###
#	Copyright 2025-2026 Tomáš Bordák
#
#	Licensed under the Apache License, Version 2.0.
#	See the LICENSE file in the project root for details.
###

#----- 1: BASE - Dependencies -----
FROM node:20-alpine AS base
WORKDIR /app

# install pnpm
RUN npm install -g pnpm

# copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.json ./
COPY apps/worker_bullmq/package.json apps/worker_bullmq/tsconfig.json ./apps/worker_bullmq/
COPY shared/prisma ./shared/prisma

RUN pnpm --filter @g4pl/worker install

#----- 2: DEV - Development -----
FROM base AS dev
WORKDIR /app

# copy source code
COPY apps/worker_bullmq/src ./apps/worker_bullmq/src

# change working directory to worker_bullmq folder, so it can then run the following CMD inside of it
WORKDIR /app/apps/worker_bullmq

# generate Prisma client and start development server
CMD pnpm exec prisma generate \
 --generator client_worker \ 
 --schema=../../shared/prisma/schema.prisma \ 
 && pnpm dev

#----- 3: PROD - Production -----
FROM node:20-alpine AS prod
WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json  ./
COPY apps/worker_bullmq/package.json apps/worker_bullmq/tsconfig.json ./apps/worker_bullmq/
COPY shared/prisma ./shared/prisma
COPY apps/worker_bullmq/src ./apps/worker_bullmq/src

# install all dependencies (needed for build, later devDependencies will be removed)
RUN pnpm --filter @g4pl/worker install

# change working directory to backend, so it can then run the following RUN and CMD inside of it
WORKDIR /app/apps/worker_bullmq

# build for production
RUN pnpm build

# install only production dependencies (reinstalls dependencies, which removes installed devDependencies)
# CI=true - was needed, because the command deletes node_modules to reinstall it (without it would crash, because there is "no TTY")
RUN CI=true pnpm install --prod

# generate Prisma client & do migrations & start production server
CMD pnpm exec prisma generate \
 --generator client_worker \
 --schema=../../shared/prisma/schema.prisma \
 && pnpm exec prisma migrate deploy \ 
 --schema=../../shared/prisma/schema.prisma \ 
 && pnpm start