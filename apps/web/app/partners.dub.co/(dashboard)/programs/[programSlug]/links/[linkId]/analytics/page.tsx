import Analytics from "@/ui/analytics";
import { PageContent } from "@/ui/layout/page-content";
import { prisma } from "@dub/prisma";
import { getPrettyUrl } from "@dub/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function PartnerAnalytics({
  params,
}: {
  params: { linkId: string; programSlug: string };
}) {
  const { linkId, programSlug } = params;
  if (!linkId || !programSlug) notFound();

  const link = await prisma.link.findUnique({
    where: { id: linkId, program: { slug: programSlug } },
    select: { shortLink: true },
  });

  if (!link) notFound();

  return (
    <PageContent
      title={
        <span>
          <span className="text-neutral-400">
            <Link
              href={`/programs/${programSlug}/links`}
              className="transition-colors duration-75 hover:text-neutral-500"
            >
              Links
            </Link>{" "}
            /
          </span>{" "}
          {getPrettyUrl(link.shortLink)}
        </span>
      }
      hideReferButton
    >
      <Analytics />
    </PageContent>
  );
}
