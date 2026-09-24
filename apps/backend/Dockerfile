###
# Copyright 2025-2026 Tomáš Bordák
#
# Licensed under the Apache License, Version 2.0.
# See the LICENSE file in the project root for details.
###

#----- 1: BASE - Dependencies -----
FROM node:20-alpine AS base
WORKDIR /app

# install pnpm
RUN npm install -g pnpm

# copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/

# copy prisma schema and migrations - needed for prisma client generation
COPY shared/prisma ./shared/prisma

# install all dependencies
RUN pnpm --filter @g4pl/backend install

#----- 2: DEV - Development -----
FROM base AS dev
WORKDIR /app

# copy source code
COPY apps/backend/src ./apps/backend/src
COPY apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts

# change working directory to backend, so it can then run the following CMD inside of it
WORKDIR /app/apps/backend

# generate Prisma client and start development server
CMD pnpm exec prisma generate \
 --generator client_backend \ 
 --schema=../../shared/prisma/schema.prisma \ 
 && pnpm exec prisma migrate deploy \ 
 --schema=../../shared/prisma/schema.prisma \ 
 && pnpm dev

#----- 3: PROD - Production -----
FROM node:20-alpine AS prod
WORKDIR /app

# install pnpm
RUN npm install -g pnpm

# copy workspace configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json ./
COPY apps/backend/package.json apps/backend/tsconfig.json ./apps/backend/

# copy prisma files
COPY shared/prisma ./shared/prisma

# copy source code
COPY apps/backend/src ./apps/backend/src

# install all dependencies (needed for build, later devDependencies will be removed)
RUN pnpm --filter @g4pl/backend install

# change working directory to backend, so it can then run the following RUN and CMD inside of it
WORKDIR /app/apps/backend

# build for production
RUN pnpm build

# install only production dependencies (reinstalls dependencies, which removes installed devDependencies)
# CI=true - was needed, because the command deletes node_modules to reinstall it (without it would crash, because there is "no TTY")
RUN CI=true pnpm install --prod

# generate Prisma client & do migrations & start production server
CMD pnpm exec prisma generate \
 --generator client_backend \
 --schema=../../shared/prisma/schema.prisma \
 && pnpm exec prisma migrate deploy \ 
 --schema=../../shared/prisma/schema.prisma \ 
 && pnpm start