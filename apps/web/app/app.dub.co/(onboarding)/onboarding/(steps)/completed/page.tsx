import { getSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { cn } from "@dub/utils";
import { redirect } from "next/navigation";

export default async function CompletedPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await searchParams;
  if (!slug) redirect("/onboarding");

  const { user } = await getSession();

  const workspace = await prisma.project.findUnique({
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

  const hasProgram = Boolean(workspace.defaultProgramId);

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-sm flex-col items-center",
        "animate-slide-up-fade [--offset:10px] [animation-duration:1s] [animation-fill-mode:both]",
      )}
    >
      <h1 className="text-pretty text-center text-xl font-semibold">
        The {workspace.name} workspace has been created
      </h1>
      <p className="mt-2 text-pretty text-center text-base text-neutral-500">
        {hasProgram
          ? "Now you can manage your partner program and short links in one place"
          : "Now you have one central, organized place to build and manage all your short links."}
      </p>
      <div className="mt-8 w-full">WIP</div>
    </div>
  );
}
