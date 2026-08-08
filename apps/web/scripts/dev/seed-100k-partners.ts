/**
 * ====================================================================================
 * 🚀 High-Scale Partner Data Seeding Script
 * ====================================================================================
 *
 * PURPOSE:
 * Bulk-generates and inserts realistic partner records into the local database
 * for local development, performance benchmarking, and testing partner search at scale.
 *
 * GENERATED DATA MODEL:
 * 1. Partner Name (`name`): Realistic first & last name combinations.
 * 2. Partner Email (`email`): Includes prefix & substring test patterns for search evaluation.
 * 3. Partner Company Name (`companyName`): Business & agency names.
 * 4. Partner Description (`description`): Marketing & creator profile text.
 * 5. Partner Platforms (`PartnerPlatform`): Assigns 1-2 web/social platforms per partner
 *    (website, youtube, twitter, linkedin, instagram, tiktok), generating ~150,000 total platform rows.
 * 6. Partner Short Links (`Link`): Generates valid `https://` short referral links per partner.
 *
 * PERFORMANCE & ARCHITECTURE DECISIONS:
 * - Chunked Bulk Insertions: Processes generation in memory and bulk-inserts using
 *   `prisma.createMany` in chunks of 2,500 records to insert ~400,000+ total rows in seconds.
 * - Pre-Computed Password Hash: Pre-computes `"password"` hash once to optimize generation time.
 * - Seed Fingerprinting: Generates deterministic namespace hashes (`seedFingerprint`) to ensure
 *   unique, non-colliding records across runs.
 *
 * CLI USAGE:
 *   cd apps/web
 *   pnpm run script dev/seed-100k-partners [--count=100000] [--programId=prog_123] [--seed=custom-seed]
 * ====================================================================================
 */

import { createId } from "@/lib/api/create-id";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { parsePositiveInteger } from "@/scripts/utils/parse-positive-integer";
import { PlatformType, Prisma } from "@prisma/client";
import { createHash } from "crypto";
import "dotenv-flow/config";

const DEFAULT_COUNT = 100_000;
const DEFAULT_SEED = "partners-search";
const CHUNK_SIZE = 2_500;

// Dataset arrays for diverse generation
// prettier-ignore
const FIRST_NAMES = [
  "Alex", "Jordan", "Taylor", "Morgan", "Chris", "Sam", "Riley", "Casey", "Dakota", "Jamie",
  "Avery", "Reese", "Skyler", "Quinn", "Rowan", "Peyton", "Finley", "Emerson", "Hayden", "Sage",
  "Logan", "Jesse", "Harper", "Eden", "Kendall", "Devon", "Dallas", "Shiloh", "River", "Phoenix",
  "Cameron", "Drew", "Eli", "Francis", "Greyson", "Hadley", "Jules", "Kai", "Lennon", "Marlowe",
];

// prettier-ignore
const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
];

// prettier-ignore
const COMPANY_SUFFIXES = [
  "Tech", "Labs", "Media", "Agency", "Studio", "Ventures", "Digital", "Creative", "Global", "Solutions",
  "Interactive", "Capital", "Partners", "Holdings", "Group", "Network", "Cloud", "AI", "Analytics", "Growth",
];

// prettier-ignore
const DOMAINS = [
  "example.com", "techcorp.io", "marketing.co", "acme.dev", "growth.app",
  "agency.net", "saas.com", "creator.xyz", "dub.co", "builder.build",
];

// prettier-ignore
const COUNTRIES = ["US", "CA", "GB", "DE", "FR", "AU", "JP", "IN", "BR", "NL", "ES", "SE", "SG"];

const DESCRIPTIONS = [
  "Affiliate marketer specializing in SaaS and developer tools.",
  "Tech reviewer & content creator with YouTube and Twitter audience.",
  "Digital marketing agency driving performance and link attribution.",
  "B2B growth strategist focusing on enterprise developer software.",
  "Social media influencer creating tech reviews, tutorials, and unboxings.",
  "E-commerce consultant helping brands scale through affiliate networks.",
  "Newsletter creator focused on modern web development and AI tools.",
  "Community leader running a developer network and podcast.",
];

const PLATFORM_TYPES: PlatformType[] = [
  PlatformType.website,
  PlatformType.youtube,
  PlatformType.twitter,
  PlatformType.linkedin,
  PlatformType.instagram,
  PlatformType.tiktok,
];

type SeedArguments = {
  totalCount: number;
  targetProgramId: string | null;
  seed: string;
};

type PartnerChunk = {
  users: Prisma.UserCreateManyInput[];
  partners: Prisma.PartnerCreateManyInput[];
  partnerUsers: Prisma.PartnerUserCreateManyInput[];
  enrollments: Prisma.ProgramEnrollmentCreateManyInput[];
  platforms: Prisma.PartnerPlatformCreateManyInput[];
  links: Prisma.LinkCreateManyInput[];
};

type GeneratePartnerChunkOptions = {
  start: number;
  end: number;
  seedFingerprint: string;
  passwordHash: string;
  runStartedAt: Date;
  programId: string;
  defaultGroupId: string | null;
  programDomain: string | null;
  workspaceId: string;
};

// Args: --count=<number> (optional, default: 100000) - Total number of partners to seed.
//       --programId=<id> (optional) - Target program ID to seed partners into.
//       --seed=<string> (optional, default: "partners-search") - Seed string for deterministic generation.
const parseArguments = (args: string[]): SeedArguments => {
  let totalCount = DEFAULT_COUNT;
  let targetProgramId: string | null = null;
  let seed = DEFAULT_SEED;

  for (const arg of args) {
    if (arg.startsWith("--count=")) {
      totalCount = parsePositiveInteger(arg.split("=")[1], "--count");
    } else if (arg.startsWith("--programId=")) {
      targetProgramId = arg.split("=")[1];
    } else if (arg.startsWith("--seed=")) {
      seed = arg.split("=")[1];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!seed || !/^[a-zA-Z0-9_-]{1,40}$/.test(seed)) {
    throw new Error(
      "--seed must contain 1-40 letters, numbers, underscores, or hyphens.",
    );
  }

  if (targetProgramId === "") {
    throw new Error("--programId cannot be empty.");
  }

  return { totalCount, targetProgramId, seed };
};

const resolveProgramId = async (targetProgramId: string | null) => {
  if (targetProgramId) {
    return targetProgramId;
  }

  const programs = await prisma.program.findMany({
    take: 2,
    select: { id: true, name: true },
  });

  if (programs.length > 1) {
    throw new Error(
      `Multiple programs found. Pass --programId=<id> to choose one (for example, ${programs[0].id} for "${programs[0].name}").`,
    );
  }

  return programs[0]?.id ?? null;
};

const generatePartnerChunk = ({
  start,
  end,
  seedFingerprint,
  passwordHash,
  runStartedAt,
  programId,
  defaultGroupId,
  programDomain,
  workspaceId,
}: GeneratePartnerChunkOptions): PartnerChunk => {
  const users: Prisma.UserCreateManyInput[] = [];
  const partners: Prisma.PartnerCreateManyInput[] = [];
  const partnerUsers: Prisma.PartnerUserCreateManyInput[] = [];
  const enrollments: Prisma.ProgramEnrollmentCreateManyInput[] = [];
  const platforms: Prisma.PartnerPlatformCreateManyInput[] = [];
  const links: Prisma.LinkCreateManyInput[] = [];

  for (let i = start; i < end; i++) {
    const partnerId = createId({ prefix: "pn_" });
    const userId = createId({ prefix: "user_" });
    const enrollmentId = createId({ prefix: "pge_" });

    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName =
      LAST_NAMES[(i + Math.floor(i / FIRST_NAMES.length)) % LAST_NAMES.length];
    const name = `${firstName} ${lastName}`;

    // Include deliberate prefix and infix cases for search verification.
    let emailPrefix: string;
    if (i % 100 === 0) {
      emailPrefix = `partner.${seedFingerprint}.${i}`;
    } else if (i % 137 === 0) {
      emailPrefix = `substringneedle.${seedFingerprint}.${i}`;
    } else if (i % 75 === 0) {
      emailPrefix = `tech.creator.${seedFingerprint}.${i}`;
    } else if (i % 50 === 0) {
      emailPrefix = `dub.affiliate.${seedFingerprint}.${i}`;
    } else {
      emailPrefix = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${seedFingerprint}.${i}`;
    }

    const domain = DOMAINS[i % DOMAINS.length];
    const email = `${emailPrefix}@${domain}`;
    const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${seedFingerprint}_${i}`;
    const companyName = `${lastName} ${COMPANY_SUFFIXES[i % COMPANY_SUFFIXES.length]}`;
    const country = COUNTRIES[i % COUNTRIES.length];
    const description = DESCRIPTIONS[i % DESCRIPTIONS.length];
    const createdAt = new Date(
      runStartedAt.getTime() - ((i * 60_000) % (365 * 86_400_000)),
    );

    users.push({
      id: userId,
      name,
      email,
      emailVerified: runStartedAt,
      passwordHash,
      defaultPartnerId: partnerId,
      createdAt,
    });

    partners.push({
      id: partnerId,
      name,
      username,
      email,
      description,
      country,
      companyName,
      networkStatus: "approved",
      createdAt,
    });

    partnerUsers.push({
      id: createId({ prefix: "pn_" }),
      userId,
      partnerId,
      role: "owner",
      createdAt,
    });

    enrollments.push({
      id: enrollmentId,
      partnerId,
      programId,
      groupId: defaultGroupId,
      status: "approved",
      createdAt,
    });

    // Give every partner one or two records across all supported platforms.
    const numPlatforms = 1 + (i % 2);
    for (let p = 0; p < numPlatforms; p++) {
      const platformType = PLATFORM_TYPES[(i + p) % PLATFORM_TYPES.length];
      const identifier =
        platformType === PlatformType.website
          ? `https://www.${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}-${i}.${domain}`
          : `@${firstName.toLowerCase()}_${lastName.toLowerCase()}_${i}`;

      platforms.push({
        id: createId({ prefix: "pn_" }),
        partnerId,
        type: platformType,
        identifier,
        subscribers: BigInt(100 + ((i * 37) % 50000)),
        views: BigInt(500 + ((i * 123) % 500000)),
        verifiedAt: createdAt,
        createdAt,
      });
    }

    // Give every partner one searchable referral link.
    const linkKey = `p-${seedFingerprint}-${i}`;
    const linkDomain = programDomain || "dub.sh";
    links.push({
      id: createId({ prefix: "link_" }),
      domain: linkDomain,
      key: linkKey,
      url: `https://${domain}/ref/${username}`,
      shortLink: `https://${linkDomain}/${linkKey}`,
      projectId: workspaceId,
      programId,
      partnerId,
      createdAt,
    });
  }

  return { users, partners, partnerUsers, enrollments, platforms, links };
};

const insertPartnerChunk = async ({
  users,
  partners,
  partnerUsers,
  enrollments,
  platforms,
  links,
}: PartnerChunk) => {
  // Keep every chunk atomic so a failed write cannot leave partial relations.
  const [, partnerResult] = await prisma.$transaction([
    prisma.user.createMany({ data: users }),
    prisma.partner.createMany({ data: partners }),
    prisma.partnerUser.createMany({ data: partnerUsers }),
    prisma.programEnrollment.createMany({ data: enrollments }),
    prisma.partnerPlatform.createMany({ data: platforms }),
    prisma.link.createMany({ data: links }),
  ]);

  return partnerResult.count;
};

async function main() {
  // Step 1: Parse and validate command-line options.
  const { totalCount, targetProgramId, seed } = parseArguments(
    process.argv.slice(2),
  );

  // Step 2: Resolve the target program and its workspace.
  const resolvedProgramId = await resolveProgramId(targetProgramId);

  console.log(
    `\n🚀 Starting Partner Data Seed (Target Count: ${totalCount.toLocaleString()}, Seed: "${seed}")...`,
  );

  const program = resolvedProgramId
    ? await prisma.program.findUnique({ where: { id: resolvedProgramId } })
    : null;

  if (!program) {
    throw new Error(
      "❌ No program found in database. Please run 'pnpm run script dev/seed' first to set up the default workspace and program.",
    );
  }

  const workspace = await prisma.project.findUnique({
    where: { id: program.workspaceId },
  });

  if (!workspace) {
    throw new Error("❌ Program workspace not found.");
  }

  console.log(
    `📍 Seeding partners for Program: "${program.name}" (${program.id})`,
  );
  console.log(`   Workspace: "${workspace.name}" (${workspace.id})\n`);

  // Step 3: Build the stable namespace shared by every generated chunk.
  // Pre-compute the password hash for 'password' once to avoid computing
  // 100,000 separate bcrypt hashes during seeding.
  const passwordHash = await hashPassword("password");
  const seedNamespace = `${program.id}:${seed}`;
  const seedFingerprint = createHash("sha256")
    .update(seedNamespace)
    .digest("hex")
    .slice(0, 16);
  const runStartedAt = new Date();
  const totalChunks = Math.ceil(totalCount / CHUNK_SIZE);
  const startTime = Date.now();
  let insertedPartners = 0;

  // Step 4: Generate and atomically insert one bounded chunk at a time.
  for (let chunk = 0; chunk < totalChunks; chunk++) {
    const chunkStart = chunk * CHUNK_SIZE;
    const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, totalCount);
    const partnerChunk = generatePartnerChunk({
      start: chunkStart,
      end: chunkEnd,
      seedFingerprint,
      passwordHash,
      runStartedAt,
      programId: program.id,
      defaultGroupId: program.defaultGroupId,
      programDomain: program.domain,
      workspaceId: workspace.id,
    });
    const insertedInChunk = await insertPartnerChunk(partnerChunk);
    insertedPartners += insertedInChunk;

    // Report processing progress and the number inserted by this chunk.
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const progressPct = (((chunk + 1) / totalChunks) * 100).toFixed(0);
    console.log(
      `  [Chunk ${chunk + 1}/${totalChunks}] (${progressPct}%) Processed ${chunkEnd.toLocaleString()}/${totalCount.toLocaleString()} partners (${insertedInChunk.toLocaleString()} new)... (${elapsedSec}s elapsed)`,
    );
  }

  // Step 5: Summarize the completed seed run.
  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n✅ Seed complete: ${insertedPartners.toLocaleString()} partners inserted (${totalTimeSec}s).`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Error running 100K partner seed script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
