/**
 * Bulk-seeds partners for local development and partner-search benchmarking.
 *
 * Writes User, Partner, PartnerUser, ProgramEnrollment, PartnerPlatform, and Link
 * rows — every field the search index reads — in atomic chunks of CHUNK_SIZE
 * partners, so 100K partners lands ~400K rows in seconds.
 *
 * Re-running with the same `--seed` collides. `seedFingerprint` is a deterministic
 * hash of the program ID and `--seed`, so identical arguments regenerate identical
 * emails, usernames, and link keys, all of which are unique columns. Pass a new
 * `--seed` to add another batch; the script checks up front and says so rather than
 * dying on a constraint error halfway through.
 *
 * This inserts login-capable users with a known password, so it refuses a non-local
 * DATABASE_URL unless `--allowRemoteDatabase` is passed.
 *
 *   cd apps/web
 *   pnpm run script dev/seed-100k-partners [--count=100000] [--programId=prog_123] [--seed=custom-seed]
 *
 * Seeded partners are not searchable until the index is backfilled:
 *   pnpm run script partners/backfill-partner-search --programId=prog_123
 */

import { createId } from "@/lib/api/create-id";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { parsePositiveInteger } from "@/scripts/utils/parse-cli-number";
import { PlatformType, Prisma } from "@prisma/client";
import { createHash } from "crypto";
import "dotenv-flow/config";

const DEFAULT_COUNT = 100_000;
const MAX_COUNT = 1_000_000;
const DEFAULT_SEED = "partners-search";
const CHUNK_SIZE = 2_500;
const LOCAL_DATABASE_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "host.docker.internal",
  "mysql",
  "db",
]);

// prettier-ignore
const FIRST_NAMES = [
  "Alex", "Jordan", "Taylor", "Morgan", "Chris", "Sam", "Riley", "Casey", "Dakota", "Jamie",
  "Avery", "Reese", "Skyler", "Quinn", "Rowan", "Peyton", "Finley", "Emerson", "Hayden", "Sage",
  "Logan", "Jesse", "Harper", "Eden", "Kendall", "Devon", "Dallas", "Shiloh", "River", "Phoenix",
  "Cameron", "Drew", "Eli", "Francis", "Greyson", "Hadley", "Jules", "Kai", "Lennon", "Marlowe",
  "Adrian", "Blake", "Corey", "Delaney", "Ellis", "Frankie", "Gray", "Hollis", "Indigo", "Justice",
  "Keegan", "Lane", "Micah", "Noel", "Oakley", "Parker", "Remy", "Sutton", "Tatum", "Wren",
  "Arden", "Bellamy", "Campbell", "Darcy",
];

// prettier-ignore
const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Okonkwo", "Bergstrom", "Castellano", "Dubois", "Eriksen", "Fitzgerald", "Grigoryan", "Halvorsen",
  "Ibrahim", "Jankowski", "Kowalczyk", "Lindqvist", "Mbeki", "Nakamura", "Oyelaran", "Petrova",
  "Quintero", "Rasmussen", "Silvestri", "Takahashi", "Ustinov", "Vasquez", "Whitfield", "Zielinski",
];

// Company names come from their own vocabulary rather than reusing the surname.
// The benchmark queries a field's longest token, so `${lastName} ${suffix}`
// mostly repeated the name field's queries and measured the same work twice.
// Every prefix is longer than every suffix, so the prefix is what gets queried.
// prettier-ignore
const COMPANY_PREFIXES = [
  "Brightwave", "Silverpine", "Northgate", "Blueshift", "Stonebridge", "Clearwater", "Ravenwood",
  "Copperfield", "Emberline", "Frostpeak", "Hollowbrook", "Jadestone", "Kingfisher", "Moonstone",
  "Nightingale", "Pinecrest", "Quicksilver", "Riverstone", "Sablewood", "Thornfield", "Umberwood",
  "Whitestone", "Amberfall", "Bramblewood", "Cindershade", "Duskwater", "Elderbrook", "Glasshouse",
  "Havenwood", "Ironbark", "Larkspire", "Meadowlark", "Opaline", "Pathfinder", "Quarrystone",
  "Redcliffe", "Saltmarsh", "Tidewater", "Vireoglen", "Windrose",
];

// Every suffix is at most six characters and every prefix at least seven, so
// the prefix is always the longest token.
// prettier-ignore
const COMPANY_SUFFIXES = [
  "Tech", "Labs", "Media", "Agency", "Studio", "Global", "Cloud", "Group", "Growth", "Union",
  "Works", "Forge", "Craft", "Point", "Scale", "Reach", "Signal", "Vector", "Summit", "Nexus",
];

// Email search queries the first five characters of the domain, so these are
// distinct in their first five.
// prettier-ignore
const DOMAINS = [
  "example.com", "techcorp.io", "marketing.co", "acme.dev", "growth.app",
  "agency.net", "saas.com", "creator.xyz", "dub.co", "builder.build",
  "pixelforge.io", "nimbus.dev", "quantum.co", "vertex.app", "zenith.net",
  "orbital.io", "catalyst.co", "summit.dev", "horizon.app", "lumina.io",
  "forgeworks.com", "bedrock.co", "kinetic.dev", "radiant.app", "stellar.io",
  "thrive.co", "upstream.dev", "waveform.app", "yonder.io", "atlas.works",
  "beacon.co", "cipher.dev", "delta.app", "ember.io", "fathom.co",
  "gradient.dev", "harbor.app", "ignite.io", "juniper.co", "keystone.dev",
];

// prettier-ignore
const COUNTRIES = ["US", "CA", "GB", "DE", "FR", "AU", "JP", "IN", "BR", "NL", "ES", "SE", "SG"];

// A description's longest word becomes its benchmark query, so the specialty is
// what has to vary — every other word here is shorter than every specialty, and
// the specialties differ within their first twelve characters (the query is
// truncated there).
const DESCRIPTION_TEMPLATES = [
  "Affiliate marketer working across %s and paid growth.",
  "Tech reviewer covering %s for a global audience.",
  "Runs a weekly newsletter about %s and dev tools.",
  "Builds long-form guides on %s for growing teams.",
  "Advises brands on %s and referral links.",
  "Hosts a podcast about %s and early-stage startups.",
  "Writes deep dives into %s and modern web tooling.",
  "Teaches short courses on %s to first-time founders.",
];

// prettier-ignore
const DESCRIPTION_SPECIALTIES = [
  "observability", "personalization", "authentication", "infrastructure", "orchestration",
  "virtualization", "containerization", "cybersecurity", "documentation", "localization",
  "monetization", "optimization", "provisioning", "segmentation", "subscriptions",
  "tokenization", "visualization", "warehousing", "attribution", "benchmarking",
  "collaboration", "deliverability", "forecasting", "reconciliation", "syndication",
  "accessibility", "interoperability", "experimentation", "instrumentation", "productization",
  "categorization", "deduplication", "geolocation", "hyperautomation", "internationalization",
  "normalization", "partitioning", "replication",
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
  allowRemoteDatabase: boolean;
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

// FNV-1a with murmur3's fmix32 finalizer. Cheap enough to call several times
// per partner, unlike a crypto hash. FNV-1a alone has weak avalanche, and this
// is called with near-identical strings (same fingerprint and index, differing
// only in the field label), whose outputs stay correlated: first and last names
// stopped pairing independently and most of the 64×64 combinations never
// occurred at all. The finalizer restores independence and stays deterministic.
function hashToUint32(value: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 0x01000193);
  }

  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;

  return hash >>> 0;
}

function generatePartnerMetrics(index: number) {
  const totalClicks = 100 + ((index * 37) % 50_000);
  const leadRate = 0.05 + (index % 16) / 100;
  const conversionRate = 0.1 + (index % 31) / 100;
  const saleRate = 0.6 + (index % 31) / 100;
  const totalLeads = Math.max(1, Math.floor(totalClicks * leadRate));
  const totalConversions = Math.max(1, Math.floor(totalLeads * conversionRate));
  const totalSales = Math.max(1, Math.floor(totalConversions * saleRate));
  const averageOrderValueCents = 2_500 + ((index * 7_919) % 197_500);
  const totalSaleAmount = BigInt(totalSales * averageOrderValueCents);
  const commissionRatePercent = 5 + (index % 26);
  const totalCommissions =
    (totalSaleAmount * BigInt(commissionRatePercent)) / BigInt(100);

  return {
    totalClicks,
    totalLeads,
    totalConversions,
    totalSales,
    totalSaleAmount,
    totalCommissions,
    netRevenue: totalSaleAmount - totalCommissions,
    earningsPerClick: Number(totalSaleAmount) / totalClicks,
    averageLifetimeValue: Number(totalSaleAmount) / totalConversions,
    clickToLeadRate: totalLeads / totalClicks,
    clickToConversionRate: totalConversions / totalClicks,
    leadToConversionRate: totalConversions / totalLeads,
    returnOnAdSpend: Number(totalSaleAmount) / Number(totalCommissions),
  } satisfies Partial<Prisma.ProgramEnrollmentCreateManyInput>;
}

// Args: --count=<number> (optional, default: 100000) - Total number of partners to seed.
//       --programId=<id> (optional) - Target program ID to seed partners into.
//       --seed=<string> (optional, default: "partners-search") - Seed string for deterministic generation.
//       --allowRemoteDatabase (optional) - Permit seeding a non-local DATABASE_URL.
const parseArguments = (args: string[]): SeedArguments => {
  let totalCount = DEFAULT_COUNT;
  let targetProgramId: string | null = null;
  let seed = DEFAULT_SEED;
  let allowRemoteDatabase = false;

  for (const arg of args) {
    if (arg.startsWith("--count=")) {
      totalCount = parsePositiveInteger(
        arg.slice("--count=".length),
        "--count",
      );
    } else if (arg.startsWith("--programId=")) {
      targetProgramId = arg.slice("--programId=".length);
    } else if (arg.startsWith("--seed=")) {
      seed = arg.slice("--seed=".length);
    } else if (arg === "--allowRemoteDatabase") {
      allowRemoteDatabase = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (totalCount > MAX_COUNT) {
    throw new Error(
      `--count cannot exceed ${MAX_COUNT.toLocaleString()}. Run the script again with a new --seed to add more.`,
    );
  }

  if (!seed || !/^[a-zA-Z0-9_-]{1,40}$/.test(seed)) {
    throw new Error(
      "--seed must contain 1-40 letters, numbers, underscores, or hyphens.",
    );
  }

  if (targetProgramId === "") {
    throw new Error("--programId cannot be empty.");
  }

  return { totalCount, targetProgramId, seed, allowRemoteDatabase };
};

// Refuse unless the host is local or the operator opts in explicitly.
const assertSeedableDatabase = (allowRemoteDatabase: boolean) => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  let host: string;
  try {
    // `URL` keeps IPv6 hosts bracketed; strip them so "::1" matches.
    host = new URL(databaseUrl).hostname.replace(/^\[|\]$/g, "");
  } catch {
    throw new Error("DATABASE_URL is not a valid connection URL.");
  }

  if (LOCAL_DATABASE_HOSTS.has(host)) {
    return;
  }

  if (allowRemoteDatabase) {
    console.warn(
      `⚠️  Seeding the non-local database at "${host}" because --allowRemoteDatabase was passed.\n`,
    );
    return;
  }

  throw new Error(
    `Refusing to seed the non-local database at "${host}". This script inserts users with a known password. Pass --allowRemoteDatabase if you are certain.`,
  );
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

  // Pick from a pool by hashing rather than `index % pool.length`. The benchmark
  // samples every Nth partner, so a stride sharing a factor with the pool size
  // lands the whole sample on one entry: at 100K partners sampled 100 ways the
  // stride is 1,000, and `index % 10` gave every sampled partner the same email
  // domain. Hashing decorrelates the choice from the index and stays
  // deterministic, so the same --seed still regenerates the same partners.
  const pick = <T>(pool: T[], field: string, index: number): T =>
    pool[hashToUint32(`${seedFingerprint}:${field}:${index}`) % pool.length];

  for (let i = start; i < end; i++) {
    const partnerId = createId({ prefix: "pn_" });
    const userId = createId({ prefix: "user_" });
    const enrollmentId = createId({ prefix: "pge_" });

    const firstName = pick(FIRST_NAMES, "firstName", i);
    const lastName = pick(LAST_NAMES, "lastName", i);
    const name = `${firstName} ${lastName}`;

    // Recognizable needles for manual search testing. The moduli are primes so
    // they cannot line up with a benchmark stride and swallow the whole sample.
    let emailPrefix: string;
    if (i % 101 === 0) {
      emailPrefix = `partner.${seedFingerprint}.${i}`;
    } else if (i % 137 === 0) {
      emailPrefix = `substringneedle.${seedFingerprint}.${i}`;
    } else if (i % 79 === 0) {
      emailPrefix = `tech.creator.${seedFingerprint}.${i}`;
    } else if (i % 53 === 0) {
      emailPrefix = `dub.affiliate.${seedFingerprint}.${i}`;
    } else {
      emailPrefix = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${seedFingerprint}.${i}`;
    }

    const domain = pick(DOMAINS, "domain", i);
    const email = `${emailPrefix}@${domain}`;
    const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${seedFingerprint}_${i}`;
    const companyName = `${pick(COMPANY_PREFIXES, "companyPrefix", i)} ${pick(COMPANY_SUFFIXES, "companySuffix", i)}`;
    const country = pick(COUNTRIES, "country", i);
    const description = pick(DESCRIPTION_TEMPLATES, "description", i).replace(
      "%s",
      pick(DESCRIPTION_SPECIALTIES, "specialty", i),
    );
    // One minute earlier per partner, wrapping at a year (index 525,600).
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
      ...generatePartnerMetrics(i),
      createdAt,
    });

    // Offsetting a hashed start keeps each partner's platform types distinct,
    // which PartnerPlatform requires per partner.
    const platformCount =
      1 + (hashToUint32(`${seedFingerprint}:platformCount:${i}`) % 3);
    const firstPlatform = hashToUint32(`${seedFingerprint}:platform:${i}`);
    for (let p = 0; p < platformCount; p++) {
      const platformType =
        PLATFORM_TYPES[(firstPlatform + p) % PLATFORM_TYPES.length];
      const identifier =
        platformType === PlatformType.website
          ? `https://www.${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}-${i}.${domain}`
          : `@${firstName.toLowerCase()}_${lastName.toLowerCase()}_${i}`;

      platforms.push({
        partnerId,
        type: platformType,
        identifier,
        subscribers: BigInt(100 + ((i * 37) % 50000)),
        views: BigInt(500 + ((i * 123) % 500000)),
        verifiedAt: createdAt,
        createdAt,
      });
    }

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

// Generation is deterministic given (programId, seed), so index 0's link key is
// always the same. Keyed on the link key rather than the email because the key
// is built from the fingerprint and index alone — editing the name or domain
// pools changes index 0's email, which would let this miss an applied seed and
// surface a raw constraint error partway through instead.
const assertSeedNotAlreadyApplied = async (
  partnerChunk: PartnerChunk,
  seed: string,
) => {
  const firstLink = partnerChunk.links[0];

  if (!firstLink) {
    return;
  }

  const existing = await prisma.link.findUnique({
    where: {
      domain_key: { domain: firstLink.domain, key: firstLink.key },
    },
    select: { id: true },
  });

  if (existing) {
    throw new Error(
      `Seed "${seed}" has already been applied to this program (found ${firstLink.domain}/${firstLink.key}). Re-running would collide on unique emails, usernames, and link keys — pass a different --seed to add another batch.`,
    );
  }
};

async function main() {
  const { totalCount, targetProgramId, seed, allowRemoteDatabase } =
    parseArguments(process.argv.slice(2));

  assertSeedableDatabase(allowRemoteDatabase);

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

  // Build the stable namespace shared by every generated chunk.
  // Pre-compute the password hash for 'password' once to avoid computing
  // a separate bcrypt hash for every generated partner.
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

    if (chunk === 0) {
      await assertSeedNotAlreadyApplied(partnerChunk, seed);
    }

    const insertedInChunk = await insertPartnerChunk(partnerChunk);
    insertedPartners += insertedInChunk;

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const progressPct = (((chunk + 1) / totalChunks) * 100).toFixed(0);
    console.log(
      `  [Chunk ${chunk + 1}/${totalChunks}] (${progressPct}%) Processed ${chunkEnd.toLocaleString()}/${totalCount.toLocaleString()} partners (${insertedInChunk.toLocaleString()} new)... (${elapsedSec}s elapsed)`,
    );
  }

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n✅ Seed complete: ${insertedPartners.toLocaleString()} partners inserted (${totalTimeSec}s).`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Error running partner seed script:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
