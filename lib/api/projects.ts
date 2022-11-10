import { redis } from "@/lib/upstash";

export async function changeDomainForLinks(
  projectId: string,
  domain: string,
  newDomain: string,
) {
  const links = await prisma.link.findMany({
    where: {
      project: {
        id: projectId,
      },
    },
  });
  const pipeline = redis.pipeline();
  pipeline.rename(`${domain}:root:clicks`, `${newDomain}:root:clicks`);
  links.forEach(({ key }) => {
    pipeline.rename(`${domain}:${key}`, `${newDomain}:${key}`);
    pipeline.rename(`${domain}:clicks:${key}`, `${newDomain}:clicks:${key}`);
  });
  try {
    return await pipeline.exec();
  } catch (e) {
    return null;
  }
}

export async function deleteProjectLinks(domain: string) {
  const links = await prisma.link.findMany({
    where: {
      project: {
        domain,
      },
    },
  });
  const pipeline = redis.pipeline();
  pipeline.del(`${domain}:root:clicks`);
  links.forEach(({ key }) => {
    pipeline.del(`${domain}:${key}`);
    pipeline.del(`${domain}:clicks:${key}`);
  });
  try {
    return await pipeline.exec();
  } catch (e) {
    return null;
  }
}
