import { createId } from "@/lib/api/create-id";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { PlatformType, Prisma } from "@prisma/client";
import "dotenv-flow/config";

// Dataset arrays for diverse generation
const FIRST_NAMES = [
  "Alex", "Jordan", "Taylor", "Morgan", "Chris", "Sam", "Riley", "Casey", "Dakota", "Jamie",
  "Avery", "Reese", "Skyler", "Quinn", "Rowan", "Peyton", "Finley", "Emerson", "Hayden", "Sage",
  "Logan", "Jesse", "Harper", "Eden", "Kendall", "Devon", "Dallas", "Shiloh", "River", "Phoenix",
  "Cameron", "Drew", "Eli", "Francis", "Greyson", "Hadley", "Jules", "Kai", "Lennon", "Marlowe"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores"
];

const COMPANY_SUFFIXES = [
  "Tech", "Labs", "Media", "Agency", "Studio", "Ventures", "Digital", "Creative", "Global", "Solutions",
  "Interactive", "Capital", "Partners", "Holdings", "Group", "Network", "Cloud", "AI", "Analytics", "Growth"
];

const DOMAINS = [
  "example.com", "techcorp.io", "marketing.co", "acme.dev", "growth.app",
  "agency.net", "saas.com", "creator.xyz", "dub.co", "builder.build"
];

const COUNTRIES = ["US", "CA", "GB", "DE", "FR", "AU", "JP", "IN", "BR", "NL", "ES", "SE", "SG"];

const DESCRIPTIONS = [
  "Affiliate marketer specializing in SaaS and developer tools.",
  "Tech reviewer & content creator with YouTube and Twitter audience.",
  "Digital marketing agency driving performance and link attribution.",
  "B2B growth strategist focusing on enterprise developer software.",
  "Social media influencer creating tech reviews, tutorials, and unboxings.",
  "E-commerce consultant helping brands scale through affiliate networks.",
  "Newsletter creator focused on modern web development and AI tools.",
  "Community leader running a developer network and podcast."
];

const PLATFORM_TYPES: PlatformType[] = [
  PlatformType.website,
  PlatformType.youtube,
  PlatformType.twitter,
  PlatformType.linkedin,
  PlatformType.instagram,
  PlatformType.tiktok
];

async function main() {
  const args = process.argv.slice(2);
  let totalCount = 100000;
  let targetProgramId: string | null = null;

  for (const arg of args) {
    if (arg.startsWith("--count=")) {
      totalCount = parseInt(arg.split("=")[1], 10) || 100000;
    } else if (arg.startsWith("--programId=")) {
      targetProgramId = arg.split("=")[1];
    }
  }

  console.log(`\n🚀 Starting 100K+ Partner Data Seed (Target Count: ${totalCount.toLocaleString()})...`);

  // Find target program & workspace
  const program = targetProgramId
    ? await prisma.program.findUnique({ where: { id: targetProgramId } })
    : await prisma.program.findFirst();

  if (!program) {
    console.error(
      "❌ No program found in database. Please run 'pnpm run script dev/seed' first to set up the default workspace and program."
    );
    process.exit(1);
  }

  const workspace = await prisma.project.findUnique({
    where: { id: program.workspaceId },
  });

  if (!workspace) {
    console.error("❌ Program workspace not found.");
    process.exit(1);
  }

  console.log(`📍 Seeding partners for Program: "${program.name}" (${program.id})`);
  console.log(`   Workspace: "${workspace.name}" (${workspace.id})\n`);

  const passwordHash = await hashPassword("password");
  const chunkSize = 2500;
  const totalChunks = Math.ceil(totalCount / chunkSize);
  const startTime = Date.now();

  for (let chunk = 0; chunk < totalChunks; chunk++) {
    const chunkStart = chunk * chunkSize;
    const chunkEnd = Math.min(chunkStart + chunkSize, totalCount);
    const currentChunkSize = chunkEnd - chunkStart;

    const chunkUsers: Prisma.UserCreateManyInput[] = [];
    const chunkPartners: Prisma.PartnerCreateManyInput[] = [];
    const chunkPartnerUsers: Prisma.PartnerUserCreateManyInput[] = [];
    const chunkEnrollments: Prisma.ProgramEnrollmentCreateManyInput[] = [];
    const chunkPlatforms: Prisma.PartnerPlatformCreateManyInput[] = [];
    const chunkLinks: Prisma.LinkCreateManyInput[] = [];

    for (let i = chunkStart; i < chunkEnd; i++) {
      const partnerId = createId({ prefix: "pn_" });
      const userId = createId({ prefix: "user_" });
      const enrollmentId = createId({ prefix: "pge_" });

      const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(i + Math.floor(i / FIRST_NAMES.length)) % LAST_NAMES.length];
      const name = `${firstName} ${lastName}`;

      const runSuffix = Math.floor(Date.now() / 1000).toString(36);
      // Email generation with deliberate test cases for search verification
      let emailPrefix: string;
      if (i % 100 === 0) {
        emailPrefix = `examp.partner.${runSuffix}.${i}`; // Ensures partial match 'examp' works
      } else if (i % 75 === 0) {
        emailPrefix = `tech.creator.${runSuffix}.${i}`;
      } else if (i % 50 === 0) {
        emailPrefix = `dub.affiliate.${runSuffix}.${i}`;
      } else {
        emailPrefix = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${runSuffix}.${i}`;
      }

      const domain = DOMAINS[i % DOMAINS.length];
      const email = `${emailPrefix}@${domain}`;
      const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${runSuffix}_${i}`;
      const companyName = `${lastName} ${COMPANY_SUFFIXES[i % COMPANY_SUFFIXES.length]}`;
      const country = COUNTRIES[i % COUNTRIES.length];
      const description = DESCRIPTIONS[i % DESCRIPTIONS.length];
      const createdAt = new Date(Date.now() - (i * 60000) % (365 * 86400000));

      // User record
      chunkUsers.push({
        id: userId,
        name,
        email,
        emailVerified: new Date(),
        passwordHash,
        defaultPartnerId: partnerId,
        createdAt,
      });

      // Partner record
      chunkPartners.push({
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

      // PartnerUser record
      chunkPartnerUsers.push({
        id: createId({ prefix: "pn_" }), // or unique ID
        userId,
        partnerId,
        role: "owner",
        createdAt,
      });

      // Program Enrollment record
      chunkEnrollments.push({
        id: enrollmentId,
        partnerId,
        programId: program.id,
        groupId: program.defaultGroupId,
        status: "approved",
        createdAt,
      });

      // Generate 1-2 Platforms per partner
      const numPlatforms = 1 + (i % 2);
      for (let p = 0; p < numPlatforms; p++) {
        const platformType = PLATFORM_TYPES[(i + p) % PLATFORM_TYPES.length];
        const identifier =
          platformType === PlatformType.website
            ? `https://www.${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}-${i}.${domain}`
            : `@${firstName.toLowerCase()}_${lastName.toLowerCase()}_${i}`;

        chunkPlatforms.push({
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

      // Generate 1 Short Link per partner
      const linkKey = `p-${firstName.toLowerCase()}-${lastName.toLowerCase()}-${i}`;
      const linkDomain = program.domain || "dub.sh";
      chunkLinks.push({
        id: createId({ prefix: "link_" }),
        domain: linkDomain,
        key: linkKey,
        url: `https://${domain}/ref/${username}`,
        shortLink: `https://${linkDomain}/${linkKey}`,
        projectId: workspace.id,
        programId: program.id,
        partnerId,
        createdAt,
      });
    }

    // Perform bulk insertions
    await prisma.user.createMany({ data: chunkUsers, skipDuplicates: true });
    await prisma.partner.createMany({ data: chunkPartners, skipDuplicates: true });
    await prisma.partnerUser.createMany({ data: chunkPartnerUsers, skipDuplicates: true });
    await prisma.programEnrollment.createMany({ data: chunkEnrollments, skipDuplicates: true });
    await prisma.partnerPlatform.createMany({ data: chunkPlatforms, skipDuplicates: true });
    await prisma.link.createMany({ data: chunkLinks, skipDuplicates: true });

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const progressPct = (((chunk + 1) / totalChunks) * 100).toFixed(0);
    console.log(
      `  [Chunk ${chunk + 1}/${totalChunks}] (${progressPct}%) Inserted ${chunkEnd.toLocaleString()}/${totalCount.toLocaleString()} partners... (${elapsedSec}s elapsed)`
    );
  }

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Successfully seeded ${totalCount.toLocaleString()} partners in ${totalTimeSec} seconds!`);
}

main()
  .catch((e) => {
    console.error("❌ Error running 100K partner seed script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
