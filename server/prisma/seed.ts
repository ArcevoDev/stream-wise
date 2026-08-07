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
  code: string;
  name: string;
  stream: AcademicStreamType | null;
  isCore?: boolean;
  isTrade?: boolean;
}[] = [
  // ── COMPULSORY CORE ───────────────────────────────────────
  { subject: Subject.ENGLISH_LANGUAGE, code: "ENG", name: "English Language", stream: null, isCore: true },
  { subject: Subject.MATHEMATICS, code: "MTH", name: "Mathematics", stream: null, isCore: true },
  { subject: Subject.CITIZENSHIP_AND_HERITAGE, code: "CHH", name: "Citizenship and Heritage", stream: null, isCore: true },
  { subject: Subject.DIGITAL_TECHNOLOGIES, code: "DGT", name: "Digital Technologies", stream: null, isCore: true },

  // ── SCIENCE STREAM ────────────────────────────────────────
  { subject: Subject.BIOLOGY, code: "BIO", name: "Biology", stream: AcademicStream.SCIENCE },
  { subject: Subject.CHEMISTRY, code: "CHM", name: "Chemistry", stream: AcademicStream.SCIENCE },
  { subject: Subject.PHYSICS, code: "PHY", name: "Physics", stream: AcademicStream.SCIENCE },
  { subject: Subject.FURTHER_MATHEMATICS, code: "FMH", name: "Further Mathematics", stream: AcademicStream.SCIENCE },
  { subject: Subject.AGRICULTURAL_SCIENCE, code: "AGR", name: "Agricultural Science", stream: AcademicStream.SCIENCE },
  { subject: Subject.ANIMAL_HUSBANDRY, code: "ANH", name: "Animal Husbandry", stream: AcademicStream.SCIENCE },
  { subject: Subject.TECHNICAL_DRAWING, code: "TDR", name: "Technical Drawing", stream: AcademicStream.SCIENCE },
  { subject: Subject.FOOD_AND_NUTRITION, code: "FDN", name: "Food and Nutrition", stream: AcademicStream.SCIENCE },
  { subject: Subject.HOME_MANAGEMENT, code: "HOM", name: "Home Management", stream: AcademicStream.SCIENCE },
  { subject: Subject.BASIC_SCIENCE, code: "BSC", name: "Basic Science", stream: AcademicStream.SCIENCE },

  // ── HUMANITIES STREAM ─────────────────────────────────────
  { subject: Subject.LITERATURE_IN_ENGLISH, code: "LIT", name: "Literature in English", stream: AcademicStream.HUMANITIES },
  { subject: Subject.GOVERNMENT, code: "GOV", name: "Government", stream: AcademicStream.HUMANITIES },
  { subject: Subject.HISTORY, code: "HIS", name: "History", stream: AcademicStream.HUMANITIES },
  { subject: Subject.GEOGRAPHY, code: "GEO", name: "Geography", stream: AcademicStream.HUMANITIES },
  { subject: Subject.CHRISTIAN_RELIGIOUS_STUDIES, code: "CRS", name: "Christian Religious Studies", stream: AcademicStream.HUMANITIES },
  { subject: Subject.ISLAMIC_RELIGIOUS_STUDIES, code: "IRS", name: "Islamic Religious Studies", stream: AcademicStream.HUMANITIES },
  { subject: Subject.FRENCH, code: "FRE", name: "French", stream: AcademicStream.HUMANITIES },
  { subject: Subject.YORUBA, code: "YOR", name: "Yoruba", stream: AcademicStream.HUMANITIES },
  { subject: Subject.IGBO, code: "IGB", name: "Igbo", stream: AcademicStream.HUMANITIES },
  { subject: Subject.HAUSA, code: "HAU", name: "Hausa", stream: AcademicStream.HUMANITIES },
  { subject: Subject.ARABIC, code: "ARA", name: "Arabic", stream: AcademicStream.HUMANITIES },
  { subject: Subject.VISUAL_ARTS, code: "VAR", name: "Visual Arts", stream: AcademicStream.HUMANITIES },
  { subject: Subject.MUSIC, code: "MUS", name: "Music", stream: AcademicStream.HUMANITIES },
  { subject: Subject.SOCIAL_STUDIES, code: "SOS", name: "Social Studies", stream: AcademicStream.HUMANITIES },

  // ── BUSINESS STREAM ───────────────────────────────────────
  { subject: Subject.ECONOMICS, code: "ECO", name: "Economics", stream: AcademicStream.BUSINESS },
  { subject: Subject.COMMERCE, code: "COM", name: "Commerce", stream: AcademicStream.BUSINESS },
  { subject: Subject.FINANCIAL_ACCOUNTING, code: "FAC", name: "Financial Accounting", stream: AcademicStream.BUSINESS },
  { subject: Subject.BOOK_KEEPING, code: "BOK", name: "Book Keeping", stream: AcademicStream.BUSINESS },
  { subject: Subject.MARKETING, code: "MKT", name: "Marketing", stream: AcademicStream.BUSINESS },
  { subject: Subject.OFFICE_PRACTICE, code: "OFP", name: "Office Practice", stream: AcademicStream.BUSINESS },
  { subject: Subject.STORE_MANAGEMENT, code: "STM", name: "Store Management", stream: AcademicStream.BUSINESS },
  { subject: Subject.DATA_PROCESSING, code: "DTP", name: "Data Processing", stream: AcademicStream.BUSINESS },
  { subject: Subject.BUSINESS_STUDIES, code: "BST", name: "Business Studies", stream: AcademicStream.BUSINESS },

  // ── VOCATIONAL TRADE SUBJECTS (NERDC — pick one) ──────────
  { subject: Subject.TRADE_WOODWORK, code: "TWW", name: "Trade: Woodwork", stream: null, isTrade: true },
  { subject: Subject.TRADE_METALWORK, code: "TMW", name: "Trade: Metalwork", stream: null, isTrade: true },
  { subject: Subject.TRADE_ELECTRONICS, code: "TEL", name: "Trade: Electronics", stream: null, isTrade: true },
  { subject: Subject.TRADE_AUTO_MECHANICS, code: "TAM", name: "Trade: Auto Mechanics", stream: null, isTrade: true },
  { subject: Subject.TRADE_COSMETOLOGY, code: "TCS", name: "Trade: Cosmetology", stream: null, isTrade: true },
  { subject: Subject.TRADE_CATERING_CRAFT, code: "TCC", name: "Trade: Catering Craft", stream: null, isTrade: true },
  { subject: Subject.TRADE_GARMENT_MAKING, code: "TGM", name: "Trade: Garment Making", stream: null, isTrade: true },
  { subject: Subject.TRADE_PLUMBING, code: "TPL", name: "Trade: Plumbing", stream: null, isTrade: true },
  { subject: Subject.TRADE_BUILDING_CONSTRUCTION, code: "TBC", name: "Trade: Building Construction", stream: null, isTrade: true },
  { subject: Subject.TRADE_COMPUTER_CRAFT, code: "TCC2", name: "Trade: Computer Craft", stream: null, isTrade: true },

  // ── GENERAL / CROSS-STREAM ────────────────────────────────
  { subject: Subject.CIVIC_EDUCATION, code: "CVE", name: "Civic Education (legacy)", stream: null },
  { subject: Subject.COMPUTER_STUDIES, code: "CPS", name: "Computer Studies", stream: null },
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
    data: SUBJECT_CATALOG.map((s, idx) => ({
      academicSessionId: session.id,
      subject: s.subject,
      subjectCode: s.code,
      name: s.name,
      streamCategory: s.stream,
      isCore: s.isCore ?? false,
      isTradeSubject: s.isTrade ?? false,
      sortOrder: idx,
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