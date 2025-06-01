import { prisma } from "@dub/prisma";
import { notFound, redirect } from "next/navigation";

export default async function Programs({
  params,
}: {
  params: { slug: string };
}) {
  const workspace = await prisma.project.findUnique({
    where: {
      slug: params.slug,
    },
    select: {
      partnersEnabled: true,
      defaultProgramId: true,
    },
  });

  if (!workspace) {
    notFound();
  }

  if (!workspace.defaultProgramId) {
    if (workspace.partnersEnabled) {
      redirect(`/${params.slug}/programs/new`);
    } else {
      redirect(`/${params.slug}`);
    }
  }

  redirect(`/${params.slug}/programs/${workspace.defaultProgramId}`);
}
