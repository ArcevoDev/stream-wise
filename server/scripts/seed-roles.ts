// ============================================================================
// Demo role-account seeder (research-project access story).
//
// Usage:  pnpm seed:roles
//
// Creates one STUDENT, one COUNSELOR, one SCHOOL_ADMIN, and one ADMIN demo
// account so supervisors / project owners can test every role-gated route
// without orchestrating signups. Safe to re-run: each upserts by email.
//
// Credentials (override via env where noted):
//   STUDENT      student@dss.test     / Student123!
//   COUNSELOR    counselor@dss.test   / Counselor123!
//   SCHOOL_ADMIN schooladmin@dss.test / SchoolAdmin123!
//   ADMIN        reads ADMIN_EMAIL/ADMIN_PASSWORD like create:admin
//                (defaults dss.admin@example.com / change-me-now)
//
// The accounts are flagged in the DB by a fixed email domain so they can be
// excluded from thesis statistics later (research-integrity note).
// ============================================================================

import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma, disconnectPrisma } from "@/db/prisma.js";
import { UserRole } from "@prisma-client";

interface DemoAccount {
  role: UserRole;
  fullName: string;
  email: string;
  password: string;
  careerAspiration?: string;
  consentGranted?: boolean;
}

async function upsertDemo(acc: DemoAccount): Promise<void> {
  if (acc.password.length < 8) {
    throw new Error(`${acc.role} password must be at least 8 characters.`);
  }
  const passwordHash = await bcrypt.hash(acc.password, 12);
  const data = {
    fullName: acc.fullName,
    passwordHash,
    role: acc.role,
    isActive: true,
    careerAspiration: acc.careerAspiration ?? null,
    // Consent pre-granted so demo students can jump straight into the flow.
    consentVersion: acc.consentGranted ? "consent-v1" : null,
    consentStatus: acc.consentGranted ? "granted" : null,
    consentGrantedAt: acc.consentGranted ? new Date() : null,
    consentPoint1: acc.consentGranted,
    consentPoint2: acc.consentGranted,
    consentPoint3: acc.consentGranted,
    consentPoint4: acc.consentGranted,
  };

  const row = await prisma.student.upsert({
    where: { email: acc.email },
    update: { ...data },
    create: { email: acc.email, ...data },
  });
  console.log(`  ${acc.role.padEnd(12)} ${row.email}`);
}

async function main(): Promise<void> {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "dss.admin@example.com").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-me-now";

  const accounts: DemoAccount[] = [
    {
      role: UserRole.STUDENT,
      fullName: "Demo Student",
      email: "student@dss.test",
      password: "Student123!",
      careerAspiration: "Medicine and Surgery",
      consentGranted: true,
    },
    {
      role: UserRole.COUNSELOR,
      fullName: "Demo Guidance Counsellor",
      email: "counselor@dss.test",
      password: "Counselor123!",
    },
    {
      role: UserRole.SCHOOL_ADMIN,
      fullName: "Demo School Admin",
      email: "schooladmin@dss.test",
      password: "SchoolAdmin123!",
    },
    {
      role: UserRole.ADMIN,
      fullName: process.env.ADMIN_NAME ?? "DSS Administrator",
      email: adminEmail,
      password: adminPassword,
    },
  ];

  console.log("Seeding demo role accounts...");
  for (const acc of accounts) {
    await upsertDemo(acc);
  }
  console.log("Done. Demo logins are documented in server/.env.example and README.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
