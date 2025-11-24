import { prisma } from "@dub/prisma";
import { APP_DOMAIN } from "@dub/utils";
import { redirect } from "next/navigation";

export default async function OldStatsPage(props: {
  params: Promise<{ domain: string; key: string }>;
}) {
  const params = await props.params;
  const link = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain: params.domain,
        key: params.key,
      },
    },
    select: {
      dashboard: true,
    },
  });

  if (!link?.dashboard) {
    redirect("/");
  }

  redirect(`${APP_DOMAIN}/share/${link.dashboard.id}`);
}
