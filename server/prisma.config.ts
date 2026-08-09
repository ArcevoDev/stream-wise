import "dotenv/config";
import { defineConfig } from "prisma/config";

// Force load process env as an ultimate fallback if Prisma's native scanner
// chokes in MINGW64 (Git Bash on Windows): kept from the working setup.
//
// NOTE: deliberately NOT using prisma/config's `env()` helper here. `env()`
// throws PrismaConfigEnvError at config-load time when the variable is
// missing, which broke `prisma generate` in CI (Vercel/Netlify run it via
// postinstall before DATABASE_URL is provisioned). `prisma generate` only
// reads the schema and never needs a live connection; the URL can be absent.
// migrate/studio/seed DO need it and fail with Prisma's own clear error.
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    // tsx (not ts-node) for consistency with the rest of the toolchain:
    // the app and `pnpm dev` both run on tsx already, so the seed script
    // uses the same ESM-native runner instead of mixing in ts-node/CJS.
    seed: "tsx prisma/seed.ts",
  },
});
