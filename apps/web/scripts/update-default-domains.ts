import prisma from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      metadata: true,
    },
  });

  const response = await prisma.defaultDomains.createMany({
    data: projects.map((project) => {
      // @ts-expect-error
      const defaultDomains = project.metadata?.defaultDomains || [];

      return {
        projectId: project.id,
        dubsh: defaultDomains.includes("dub.sh"),
        chatgpt: defaultDomains.includes("chatg.pt"),
        sptifi: defaultDomains.includes("spti.fi"),
        gitnew: true,
        amznid: defaultDomains.includes("amzn.id"),
      };
    }),
  });

  console.log({ response });
}

main();
