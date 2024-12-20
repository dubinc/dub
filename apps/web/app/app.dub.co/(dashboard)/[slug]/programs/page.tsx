import { PageContent } from "@/ui/layout/page-content";
import { prisma } from "@dub/prisma";
import { notFound, redirect } from "next/navigation";
import { ProgramsPageClient } from "./page-client";

export default async function Programs({
  params,
}: {
  params: { slug: string };
}) {
  const program = await prisma.program.findFirst({
    where: {
      workspace: {
        slug: params.slug,
      },
    },
  });
  if (!program) {
    notFound();
  }

  redirect(`/${params.slug}/programs/${program.id}`);

  return (
    <PageContent>
      <ProgramsPageClient />
    </PageContent>
  );
}
