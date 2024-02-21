import { inviteChecks } from "@/lib/api/users";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { LoadingSpinner, Logo } from "@dub/ui";
import { APP_NAME, TWO_WEEKS_IN_SECONDS } from "@dub/utils";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const runtime = "nodejs";

export default function InvitesPage({
  params,
}: {
  params: {
    code: string;
  };
}) {
  return (
    <div className="flex h-screen flex-col items-center justify-center space-y-6 text-center">
      <Logo className="h-12 w-12" />
      <Suspense
        fallback={
          <>
            <h1 className="font-display text-4xl font-bold">
              Verifying Invite
            </h1>
            <p className="text-lg text-gray-600">
              {APP_NAME} is verifying your invite link.
              <br /> Please wait...
            </p>
            <LoadingSpinner className="h-7 w-7" />
          </>
        }
      >
        <VerifyInvite code={params.code} />
      </Suspense>
    </div>
  );
}

async function VerifyInvite({ code }: { code: string }) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // fake promise 3s
  const project = await prisma.project.findUnique({
    select: {
      id: true,
      slug: true,
      usersLimit: true,
    },
    where: {
      inviteCode: code,
    },
  });

  if (!project) {
    redirect("/");
  }

  const [alreadyInTeam, projectUserCount] = await inviteChecks({
    projectId: project.id,
    email: session.user.email,
  });

  if (alreadyInTeam) {
    redirect(`/${project.slug}`);
  }

  if (projectUserCount >= project.usersLimit) {
    return (
      <>
        <h1 className="font-display text-4xl font-bold">User Limit Reached</h1>
        <p className="text-lg text-gray-600">
          This project has reached its user limit.
        </p>
      </>
    );
  }

  try {
    await prisma.projectInvite.create({
      data: {
        email: session.user.email,
        expires: new Date(Date.now() + TWO_WEEKS_IN_SECONDS * 1000),
        projectId: project.id,
      },
    });
  } catch (e) {
    if (e.code !== "P2002") {
      return (
        <>
          <h1 className="font-display text-4xl font-bold">Error</h1>
          <p className="text-lg text-gray-600">{e.message}</p>
        </>
      );
    }
  }

  redirect(`/${project.slug}`);
}
