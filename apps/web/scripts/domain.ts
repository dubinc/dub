import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const domain = await prisma.domain.create({
    data: {
      id: createId({ prefix: "dom_" }),
      slug: "thomas.link",
      verified: true,
      projectId: "ws_1K1J9DXEDB3W9XT51Z2849M8Y",
    },
  });

  const registerDomain = await prisma.registeredDomain.create({
    data: {
      id: createId({ prefix: "dom_" }),
      slug: domain.slug,
      projectId: domain.projectId!,
      domainId: domain.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    },
  });

  console.log(domain, registerDomain);
}

main();
