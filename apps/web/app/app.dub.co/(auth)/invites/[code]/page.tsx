import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoadingSpinner, Logo } from "@dub/ui";
import { APP_NAME } from "@dub/utils";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const runtime = "nodejs";

const PageCopy = ({ title, message }: { title: string; message: string }) => {
  return (
    <>
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="max-w-lg text-pretty text-gray-600 sm:text-lg">{message}</p>
    </>
  );
};

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
            <PageCopy
              title="Verifying Invite"
              message={`${APP_NAME} is verifying your invite link...`}
            />
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

  const workspace = await prisma.project.findUnique({
    where: {
      inviteCode: code,
    },
    select: {
      id: true,
      slug: true,
      usersLimit: true,
      users: {
        where: {
          userId: session.user.id,
        },
        select: {
          role: true,
        },
      },
      _count: {
        select: {
          users: {
            where: {
              user: {
                isMachine: false,
              },
            },
          },
        },
      },
    },
  });

  if (!workspace) {
    return (
      <>
        <PageCopy
          title="Invalid Invite"
          message="The invite link you are trying to use is invalid. Please contact the workspace owner for a new invite."
        />
      </>
    );
  }

  // check if user is already in the workspace
  if (workspace.users.length > 0) {
    redirect(`/${workspace.slug}`);
  }

  if (workspace._count.users >= workspace.usersLimit) {
    return (
      <PageCopy
        title="User Limit Reached"
        message="The workspace you are trying to join is currently full. Please contact the workspace owner for more information."
      />
    );
  }

  await prisma.projectUsers.create({
    data: {
      userId: session.user.id,
      projectId: workspace.id,
    },
  });

  redirect(`/${workspace.slug}`);
}
