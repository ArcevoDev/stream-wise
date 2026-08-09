// ============================================================================
// Admin bootstrap script.
// Usage:  pnpm create:admin  (reads ADMIN_EMAIL / ADMIN_PASSWORD from .env,
//         falls back to dss.admin@example.com / change-me-now)
// Creates an ADMIN account in the Student table if none exists with that
// email. Safe to re-run: it upserts rather than duplicating.
// ============================================================================

import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma, disconnectPrisma } from "@/db/prisma.js";
import { UserRole } from "@prisma-client";

async function main(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? "dss.admin@example.com").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD ?? "change-me-now";

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.student.upsert({
    where: { email },
    update: { role: UserRole.ADMIN, isActive: true },
    create: {
      fullName: process.env.ADMIN_NAME ?? "DSS Administrator",
      email,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  console.log(`Admin account ready: ${admin.email} (${admin.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
