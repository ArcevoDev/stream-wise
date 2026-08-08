// ============================================================================
// Seed script — populates the JAMB course catalog + versioned domain catalogs.
// Run via: pnpm prisma:migrate (auto-seeds) or manually: pnpm seed
// Uses the same adapter-backed Prisma client as the running app so behaviour
// is identical between seeding and normal operation.
//
// Mandatory subjects are now Subject enum values (not free-text strings),
// matching the JambCourseSubject join table. Where the original catalog had
// "Economics or Commerce"-style alternatives, we pick the single subject
// that the SAW recommendation flow would assign to that stream's compulsory
// elective set — see README for the full alternative-subject discussion.
//
// P0-1: this seed now also creates:
//   - the active AcademicSession ("2025/2026")
//   - the SubjectCatalog rows (which subjects exist / are core / trade / stream)
//   - the versioned AhpWeightSet row (computed via the engine's
//     computeAhpWeights on the canonical pairwise matrix, so the DB row is
//     guaranteed to match the engine math exactly)
// ============================================================================

import "dotenv/config";
import { prisma, disconnectPrisma } from "@/db/prisma.js";
import { AcademicStream, Subject } from "./generated/client";
import { computeAhpWeights, DEFAULT_PAIRWISE_MATRIX, DEFAULT_CRITERION_LABELS } from "../src/engine/ahp.js";
import type { AcademicStream as AcademicStreamType, Subject as SubjectType } from "./generated/client.js";

interface JambSeedEntry {
  courseName: string;
  facultyArea: string;
  mandatorySubjects: SubjectType[];
  streamCategory: AcademicStreamType;
  description: string;
  utmeCutoffHint?: number;
}

const JAMB_CATALOG: JambSeedEntry[] = [
  // ── SCIENCE STREAM ───────────────────────────────────────
  {
    courseName: "Medicine and Surgery",
    facultyArea: "Medical Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.BIOLOGY, Subject.CHEMISTRY, Subject.PHYSICS],
    streamCategory: AcademicStream.SCIENCE,
    description: "MBBS programme; 6 years. Highest demand in the health sector.",
    utmeCutoffHint: 280,
  },
  {
    courseName: "Pharmacy",
    facultyArea: "Medical Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.CHEMISTRY, Subject.BIOLOGY, Subject.MATHEMATICS],
    streamCategory: AcademicStream.SCIENCE,
    description: "B.Pharm programme; 5 years. Strong pharmaceutical industry demand.",
    utmeCutoffHint: 250,
  },
  {
    courseName: "Nursing Science",
    facultyArea: "Medical Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.BIOLOGY, Subject.CHEMISTRY, Subject.PHYSICS],
    streamCategory: AcademicStream.SCIENCE,
    description: "B.Sc Nursing; 4 years. Critical healthcare workforce.",
    utmeCutoffHint: 230,
  },
  {
    courseName: "Biochemistry",
    facultyArea: "Pure Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.CHEMISTRY, Subject.BIOLOGY, Subject.MATHEMATICS],
    streamCategory: AcademicStream.SCIENCE,
    description: "B.Sc Biochemistry; 4 years. Gateway to research and biotech.",
    utmeCutoffHint: 200,
  },
  {
    courseName: "Computer Science",
    facultyArea: "Computing",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.MATHEMATICS, Subject.PHYSICS],
    streamCategory: AcademicStream.SCIENCE,
    description: "B.Sc Computer Science; 4 years. High labour market demand.",
    utmeCutoffHint: 220,
  },
  {
    courseName: "Electrical Engineering",
    facultyArea: "Engineering",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.MATHEMATICS, Subject.PHYSICS, Subject.CHEMISTRY],
    streamCategory: AcademicStream.SCIENCE,
    description: "B.Eng Electrical Engineering; 5 years. Core infrastructure sector.",
    utmeCutoffHint: 230,
  },
  {
    courseName: "Civil Engineering",
    facultyArea: "Engineering",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.MATHEMATICS, Subject.PHYSICS, Subject.CHEMISTRY],
    streamCategory: AcademicStream.SCIENCE,
    description: "B.Eng Civil Engineering; 5 years. Construction and infrastructure.",
    utmeCutoffHint: 220,
  },
  {
    courseName: "Agricultural Science",
    facultyArea: "Agriculture",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.BIOLOGY, Subject.CHEMISTRY, Subject.AGRICULTURAL_SCIENCE],
    streamCategory: AcademicStream.SCIENCE,
    description: "B.Sc Agriculture; 4 years. Food security and rural development.",
    utmeCutoffHint: 180,
  },
  {
    courseName: "Mathematics",
    facultyArea: "Pure Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.MATHEMATICS, Subject.PHYSICS],
    streamCategory: AcademicStream.SCIENCE,
    description: "B.Sc Mathematics; 4 years. Foundational for data science and finance.",
    utmeCutoffHint: 180,
  },
  {
    courseName: "Physics",
    facultyArea: "Pure Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.MATHEMATICS, Subject.PHYSICS, Subject.CHEMISTRY],
    streamCategory: AcademicStream.SCIENCE,
    description: "B.Sc Physics; 4 years. Research and applied technology.",
    utmeCutoffHint: 180,
  },
  {
    courseName: "Statistics",
    facultyArea: "Pure Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.MATHEMATICS],
    streamCategory: AcademicStream.SCIENCE,
    description: "B.Sc Statistics; 4 years. Data analysis and research.",
    utmeCutoffHint: 180,
  },

  // ── HUMANITIES STREAM ────────────────────────────────────
  {
    courseName: "Law",
    facultyArea: "Law",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.LITERATURE_IN_ENGLISH],
    streamCategory: AcademicStream.HUMANITIES,
    description: "LLB; 5 years. Legal practice, judiciary, and corporate law.",
    utmeCutoffHint: 250,
  },
  {
    courseName: "Mass Communication",
    facultyArea: "Social Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.LITERATURE_IN_ENGLISH],
    streamCategory: AcademicStream.HUMANITIES,
    description: "B.Sc Mass Communication; 4 years. Media, journalism, and PR.",
    utmeCutoffHint: 220,
  },
  {
    courseName: "English and Literary Studies",
    facultyArea: "Arts",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.LITERATURE_IN_ENGLISH],
    streamCategory: AcademicStream.HUMANITIES,
    description: "B.A English; 4 years. Teaching, publishing, and creative industries.",
    utmeCutoffHint: 180,
  },
  {
    courseName: "History and International Studies",
    facultyArea: "Arts",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.HISTORY, Subject.GOVERNMENT],
    streamCategory: AcademicStream.HUMANITIES,
    description: "B.A History; 4 years. Diplomacy, policy, and academia.",
    utmeCutoffHint: 180,
  },
  {
    courseName: "Sociology",
    facultyArea: "Social Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.GOVERNMENT],
    streamCategory: AcademicStream.HUMANITIES,
    description: "B.Sc Sociology; 4 years. Social work, policy research, and NGOs.",
    utmeCutoffHint: 180,
  },
  {
    courseName: "Political Science",
    facultyArea: "Social Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.GOVERNMENT],
    streamCategory: AcademicStream.HUMANITIES,
    description: "B.Sc Political Science; 4 years. Governance, diplomacy, and public policy.",
    utmeCutoffHint: 200,
  },
  {
    courseName: "Education (English)",
    facultyArea: "Education",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.LITERATURE_IN_ENGLISH],
    streamCategory: AcademicStream.HUMANITIES,
    description: "B.Ed English; 4 years. Teaching and curriculum development.",
    utmeCutoffHint: 160,
  },

  // ── BUSINESS STREAM ──────────────────────────────────────
  {
    courseName: "Accounting",
    facultyArea: "Management Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.MATHEMATICS, Subject.ECONOMICS],
    streamCategory: AcademicStream.BUSINESS,
    description: "B.Sc Accounting; 4 years. Finance, audit, and tax advisory.",
    utmeCutoffHint: 220,
  },
  {
    courseName: "Banking and Finance",
    facultyArea: "Management Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.MATHEMATICS, Subject.ECONOMICS],
    streamCategory: AcademicStream.BUSINESS,
    description: "B.Sc Banking and Finance; 4 years. Financial services sector.",
    utmeCutoffHint: 210,
  },
  {
    courseName: "Business Administration",
    facultyArea: "Management Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.MATHEMATICS, Subject.COMMERCE],
    streamCategory: AcademicStream.BUSINESS,
    description: "B.Sc Business Admin; 4 years. Management and entrepreneurship.",
    utmeCutoffHint: 200,
  },
  {
    courseName: "Economics",
    facultyArea: "Social Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.MATHEMATICS, Subject.ECONOMICS],
    streamCategory: AcademicStream.BUSINESS,
    description: "B.Sc Economics; 4 years. Policy, finance, and development.",
    utmeCutoffHint: 200,
  },
  {
    courseName: "Marketing",
    facultyArea: "Management Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.MATHEMATICS, Subject.COMMERCE],
    streamCategory: AcademicStream.BUSINESS,
    description: "B.Sc Marketing; 4 years. Sales, brand management, and digital marketing.",
    utmeCutoffHint: 170,
  },
  {
    courseName: "Insurance",
    facultyArea: "Management Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.MATHEMATICS, Subject.ECONOMICS],
    streamCategory: AcademicStream.BUSINESS,
    description: "B.Sc Insurance; 4 years. Risk management and financial services.",
    utmeCutoffHint: 160,
  },
  {
    courseName: "Public Administration",
    facultyArea: "Management Sciences",
    mandatorySubjects: [Subject.ENGLISH_LANGUAGE, Subject.GOVERNMENT],
    streamCategory: AcademicStream.BUSINESS,
    description: "B.Sc Public Administration; 4 years. Civil service and governance.",
    utmeCutoffHint: 170,
  },
];

const ACTIVE_SESSION = "2025/2026";

/**
 * SubjectCatalog seed — one row per (session, subject) with its stream
 * placement, core/trade flags, and display code/name. This is the versioned
 * source of truth for "which subjects exist in this NERDC session" (P0-1a).
 * The Subject enum stays the stable identity; the catalog scopes validity.
 */
const SUBJECT_CATALOG: {
  subject: SubjectType;
  name: string;
  stream: AcademicStreamType | null;
  isCore?: boolean;
}[] = [
  // ── COMPULSORY CORE ───────────────────────────────────────
  { subject: Subject.ENGLISH_LANGUAGE, name: "English Language", stream: null, isCore: true },
  { subject: Subject.MATHEMATICS, name: "Mathematics", stream: null, isCore: true },
  { subject: Subject.CITIZENSHIP_AND_HERITAGE, name: "Citizenship and Heritage", stream: null, isCore: true },
  { subject: Subject.DIGITAL_TECHNOLOGIES, name: "Digital Technologies", stream: null, isCore: true },

  // ── SCIENCE STREAM ────────────────────────────────────────
  { subject: Subject.BIOLOGY, name: "Biology", stream: AcademicStream.SCIENCE },
  { subject: Subject.CHEMISTRY, name: "Chemistry", stream: AcademicStream.SCIENCE },
  { subject: Subject.PHYSICS, name: "Physics", stream: AcademicStream.SCIENCE },
  { subject: Subject.FURTHER_MATHEMATICS, name: "Further Mathematics", stream: AcademicStream.SCIENCE },
  { subject: Subject.AGRICULTURAL_SCIENCE, name: "Agricultural Science", stream: AcademicStream.SCIENCE },
  { subject: Subject.ANIMAL_HUSBANDRY, name: "Animal Husbandry", stream: AcademicStream.SCIENCE },
  { subject: Subject.TECHNICAL_DRAWING, name: "Technical Drawing", stream: AcademicStream.SCIENCE },
  { subject: Subject.FOOD_AND_NUTRITION, name: "Food and Nutrition", stream: AcademicStream.SCIENCE },
  { subject: Subject.HOME_MANAGEMENT, name: "Home Management", stream: AcademicStream.SCIENCE },

  // ── HUMANITIES STREAM ─────────────────────────────────────
  { subject: Subject.LITERATURE_IN_ENGLISH, name: "Literature in English", stream: AcademicStream.HUMANITIES },
  { subject: Subject.GOVERNMENT, name: "Government", stream: AcademicStream.HUMANITIES },
  { subject: Subject.HISTORY, name: "History", stream: AcademicStream.HUMANITIES },
  { subject: Subject.GEOGRAPHY, name: "Geography", stream: AcademicStream.HUMANITIES },
  { subject: Subject.CHRISTIAN_RELIGIOUS_STUDIES, name: "Christian Religious Studies", stream: AcademicStream.HUMANITIES },
  { subject: Subject.ISLAMIC_RELIGIOUS_STUDIES, name: "Islamic Religious Studies", stream: AcademicStream.HUMANITIES },
  { subject: Subject.FRENCH, name: "French", stream: AcademicStream.HUMANITIES },
  { subject: Subject.YORUBA, name: "Yoruba", stream: AcademicStream.HUMANITIES },
  { subject: Subject.IGBO, name: "Igbo", stream: AcademicStream.HUMANITIES },
  { subject: Subject.HAUSA, name: "Hausa", stream: AcademicStream.HUMANITIES },
  { subject: Subject.ARABIC, name: "Arabic", stream: AcademicStream.HUMANITIES },
  { subject: Subject.VISUAL_ARTS, name: "Visual Arts", stream: AcademicStream.HUMANITIES },
  { subject: Subject.MUSIC, name: "Music", stream: AcademicStream.HUMANITIES },

  // ── BUSINESS STREAM ───────────────────────────────────────
  { subject: Subject.ECONOMICS, name: "Economics", stream: AcademicStream.BUSINESS },
  { subject: Subject.COMMERCE, name: "Commerce", stream: AcademicStream.BUSINESS },
  { subject: Subject.FINANCIAL_ACCOUNTING, name: "Financial Accounting", stream: AcademicStream.BUSINESS },
];

async function seedVersionedCatalogs(): Promise<void> {
  console.log("Seeding versioned catalogs (AcademicSession + SubjectCatalog + AhpWeightSet)...");

  // Upsert the active academic session.
  const session = await prisma.academicSession.upsert({
    where: { name: ACTIVE_SESSION },
    update: { isActive: true },
    create: { name: ACTIVE_SESSION, label: "2025/2026 NERDC curriculum", isActive: true },
  });

  // Rebuild the subject catalog for this session (idempotent).
  await prisma.subjectCatalog.deleteMany({ where: { academicSessionId: session.id } });
  await prisma.subjectCatalog.createMany({
    data: SUBJECT_CATALOG.map((s) => ({
      academicSessionId: session.id,
      subject: s.subject,
      name: s.name,
      streamCategory: s.stream,
      isCore: s.isCore ?? false,
    })),
  });

  // Compute the canonical weight set via the engine itself — the DB row is
  // guaranteed to match computeAhpWeights() exactly. (P0-1c provenance.)
  const ahp = computeAhpWeights(DEFAULT_PAIRWISE_MATRIX, DEFAULT_CRITERION_LABELS);

  const existing = await prisma.ahpWeightSet.findUnique({ where: { version: "ahp-v1.0" } });
  if (!existing) {
    // Only one weight set may be active at a time — deactivate any others
    // before activating this one (idempotent re-seed).
    await prisma.ahpWeightSet.updateMany({ where: { isActive: true }, data: { isActive: false } });
    await prisma.ahpWeightSet.create({
      data: {
        version: "ahp-v1.0",
        label: "5 guidance counsellors' expert judgement (thesis §3.5.2)",
        criterionLabels: DEFAULT_CRITERION_LABELS,
        pairwiseMatrix: DEFAULT_PAIRWISE_MATRIX,
        weights: ahp.weights,
        lambdaMax: ahp.lambda,
        ci: ahp.ci,
        cr: ahp.cr,
        isActive: true,
        academicSessionId: session.id,
      },
    });
  } else {
    // Keep the seeded set active (fresh re-seed after a wipe), deactivating
    // any other active set. Refresh the session link too — after a wipe the
    // old FK may have been SET NULL.
    await prisma.ahpWeightSet.updateMany({ where: { isActive: true }, data: { isActive: false } });
    await prisma.ahpWeightSet.update({
      where: { id: existing.id },
      data: { isActive: true, academicSessionId: session.id },
    });
  }

  console.log(`Seeded academic session "${ACTIVE_SESSION}" with ${SUBJECT_CATALOG.length} catalog subjects + AHP weight set (CR ${ahp.cr}).`);
}

async function main(): Promise<void> {
  console.log("Seeding JAMB course catalog (relational JambCourse + JambCourseSubject)...");

  // Order matters: JambCourseSubject cascades from JambCourse, so clearing
  // the parent table is sufficient (ON DELETE CASCADE handles children).
  await prisma.jambCourse.deleteMany();

  for (const entry of JAMB_CATALOG) {
    await prisma.jambCourse.create({
      data: {
        courseName: entry.courseName,
        facultyArea: entry.facultyArea,
        streamCategory: entry.streamCategory,
        description: entry.description,
        utmeCutoffHint: entry.utmeCutoffHint,
        admissionCycle: ACTIVE_SESSION,
        mandatorySubjects: {
          create: entry.mandatorySubjects.map((subject) => ({ subject })),
        },
      },
    });
  }

  await seedVersionedCatalogs();

  console.log(`Seeded ${JAMB_CATALOG.length} JAMB course entries with relational subject requirements.`);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });