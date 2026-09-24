# Walora

Information system for managing logistics processes in the 4PL model with interfaces for the 4PL provider, partners and customers

Author: Tomáš Bordák

## License

Copyright 2025-2026 Tomáš Bordák.

Licensed under the Apache License, Version 2.0. See [LICENSE](./LICENSE) for details.

You may use, modify, distribute, and self-host this software, including for commercial purposes, under the terms of the license.

Commercial hosting, support, implementation, and custom development services may be offered separately by the author.

## Development Setup

#### Before start, do this in root of the project:

1. make sure to have .env file in root (you can use .env.example, just fill it with secrets and remove the '.example')
2. install pnpm - if you have npm already: `npm install -g pnpm`
3. install dependencies - `pnpm install`

#### To start development version run the next steps **_in root_**:

1. `docker compose up` - starts containers (backend, database)
   - to then stop and remove containers created by `up` do `docker compose down`
     Prisma ORM Client in the backend container and reload the container
2. Apply migrations to database trough Prisma ORM: `pnpm run prisma:apply`
3. Seed database with: `pnpm run prisma:seed`
4. `pnpm run dev:hub` - starts frontend app Vite dev. server on localhost (vue app)

Development checklist

- .env file ready (look to .env.example)
- NODE_ENV=dev
- `docker compose up` - containers except frontend
- `pnpm run dev:hub` - frontend dev. server
- to seed the database with first user and that is going to be admin (admin credentials are set in .env) run:
  - `pnpm run prisma:seed`
  - note: backend container needs to be running
- when you change schema.prisma run:
  - `pnpm run prisma:migrate [MIGRATION_NAME]` - this will also build new Prisma Client after migration
- to start Prisma Studio run:
  - `export DATABASE_URL="postgresql://[POSTGRES_USER]:[POSTGRES_PASSWORD]@localhost:5432/[POSTGRES_DB]"`
    - note: fill '[...]' with values from .env
  - `export NODE_ENV=dev`
  - `pnpm run prisma:studio`

## Prisma

- **Prisma Client** - auto-generated TypeScript client (ORM) to query the database
  - generated via `pnpm run prisma:generate` script (run in root)
- **Prisma Migrations** - set of changes to the database scheme, versioned history of all DB changes
  - after updating schema, create new migration `pnpm run prisma:migrate [MIGRATION_NAME]`, prisma will compare the new schema with the last migration, generates SQL to apply changes and updates DB
  - after that, generate Prisma Client (documented just before), so you can use all available procedures based on the new DB scheme
- **Prisma Studio** - manage database data visually in web app on host
  - firstly, set environment variable DATABASE_URL: `export DATABASE_URL="postgresql://[POSTGRES_USER]:[POSTGRES_PASSWORD]@localhost:5432/[POSTGRES_DB]"`
    - edit the variables in [...] to match the ones in your .env (there is .env.example in root you can use to create .env)
    - you can verify with `echo $DATABASE_URL`
  - then run `pnpm run prisma:studio` to start the studio at http://localhost:5555
    - the studio does not run from container - it runs on host and connects to database container trough the DATABASE_URL env. variable which contains a connection string

## Production and Deployment Setup

- before certbot starts for the first time, create ./certbot/conf and ./certbot/www directories
- nginx or script will build frontend (and only copy /dist, where its builded) and then nginx will serve them on port 443 with SSL for HTTPS
- start production with `pnpm run start` and stop with `pnpm run stop`

## Folder "shared"

Contains:

- prisma/
  - migrations
  - schema.prisma
