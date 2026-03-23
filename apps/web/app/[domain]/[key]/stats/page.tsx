import { prisma } from "@dub/prisma";
import { APP_DOMAIN } from "@dub/utils";
import { redirect } from "next/navigation";

export default async function OldStatsPage(props: {
  params: Promise<{ domain: string; key: string }>;
}) {
  const params = await props.params;
  const domain = params.domain;
  const key = decodeURIComponent(params.key);

  const link = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain,
        key,
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
