import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import { redirect } from "next/navigation";
import { SuccessPageClient } from "./page-client";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await searchParams;
  if (!slug) redirect("/onboarding");

  const { user } = await getSession();

  const workspace = await prisma.project.findUnique({
    select: {
      slug: true,
      name: true,
      logo: true,
      plan: true,
      defaultProgramId: true,
    },
    where: {
      slug,
      users: {
        some: {
          userId: user.id,
        },
      },
    },
  });
  if (!workspace) redirect("/onboarding");

  return (
    <SuccessPageClient
      workspace={{
        ...workspace,
        plan: workspace.plan as WorkspaceProps["plan"],
      }}
    />
  );
}
