import { getSession } from "@/lib/auth";
import { vaidateAuthorizeRequest } from "@/lib/oauth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { authorizeSchema } from "@/lib/zod/schemas/oauth";
import { Background, Footer, Nav } from "@dub/ui";
import { TimerOff } from "lucide-react";
import { redirect } from "next/navigation";
import { AuthorizeForm } from "./AuthorizeForm";

export const runtime = "nodejs";

// export const metadata = constructMetadata({
//   title: "Expired Link – Dub.co",
//   description:
//     "This link has expired. Please contact the owner of this link to get a new one.",
//   noIndex: true,
// });

export default async function Authorize({
  searchParams,
}: {
  searchParams?: z.infer<typeof authorizeSchema>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { oAuthClient, request } = await vaidateAuthorizeRequest(searchParams);

  const workspaces = await prisma.project.findMany({
    where: {
      users: {
        some: {
          userId: session.user.id,
        },
      },
    },
    select: {
      id: true,
      name: true,
      logo: true,
    },
  });

  return (
    <main className="flex min-h-screen flex-col justify-between">
      <Nav />
      <div className="z-10 mx-2 my-10 flex max-w-md flex-col items-center space-y-5 px-2.5 text-center sm:mx-auto sm:max-w-lg sm:px-0 lg:mb-16">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-gray-300 bg-white/30">
          <TimerOff className="h-6 w-6 text-gray-400" />
        </div>
        <h1 className="font-display text-5xl font-bold">{oAuthClient.name}</h1>
        <p className="text-lg text-gray-600">{}</p>
        <AuthorizeForm
          oAuthClient={oAuthClient}
          workspaces={workspaces}
          {...request}
        />
      </div>
      <Footer />
      <Background />
    </main>
  );
}
