import { getSession } from "@/lib/auth";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { redirect } from "next/navigation";
import { ProgramPageClient } from "./page-client";

export default async function ProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { workspace: slug } = await searchParams;

  if (!slug) redirect("/onboarding");

  const { user } = await getSession();

  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      slug,
      users: {
        some: {
          userId: user.id,
        },
      },
    },
    select: {
      id: true,
      domains: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  const data = await redis.get<{ domain: string; userId: string }>(
    `onboarding-domain:${workspace.id}`,
  );

  const onboardingDomain =
    data && data.domain && data.userId === user.id ? data.domain : null;

  const domain = onboardingDomain || workspace.domains[0]?.slug;

  if (!domain)
    redirect(`/onboarding/domain?workspace=${slug}&product=partners`);

  return <ProgramPageClient domain={domain} />;
}
