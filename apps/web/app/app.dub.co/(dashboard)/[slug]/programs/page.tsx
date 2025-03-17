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
      programs: true,
    },
  });

  if (!workspace) {
    notFound();
  }

  if (workspace.programs.length === 0) {
    if (workspace.partnersEnabled) {
      redirect(`/${params.slug}/programs/new`);
    } else {
      notFound();
    }
  }

  redirect(`/${params.slug}/programs/${workspace.programs[0].id}`);
}
