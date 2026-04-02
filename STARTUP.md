# development (infra only)
docker compose --env-file .env.development --profile dev up -d

# production (infra + backend)
docker compose --env-file .env.production --profile prod up -d
docker compose --env-file .env.production --profile prod  up -d --build

# stop
docker compose --env-file .env.development --profile dev down
docker compose --env-file .env.production --profile prod down

# Drizzle
npx drizzle-kit generate --config=src/configs/drizzle.config.ts
npx drizzle-kit push --config=src/configs/drizzle.config.ts
