import { getProgram } from "@/lib/fetchers/get-program";
import { prisma } from "@dub/prisma";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import RegisterPageClient from "./page-client";

export default async function RegisterPage({
  params,
}: {
  params: { programSlug?: string };
}) {
  const { programSlug } = params;
  const program = programSlug
    ? (await getProgram({ slug: programSlug })) ?? undefined
    : undefined;

  if (programSlug && !program) notFound();

  let email: string | undefined = undefined;
  let lockEmail = false;

  if (program) {
    const cookieStore = cookies();
    const programApplicationIds = cookieStore
      .get("programApplicationIds")
      ?.value?.split(",");

    const applications = programApplicationIds?.length
      ? await prisma.programApplication.findMany({
          where: {
            id: {
              in: programApplicationIds.filter(Boolean),
            },
            enrollment: null,
            partnerId: null,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        })
      : [];

    if (applications.length) {
      email = applications[0].email;
      lockEmail =
        applications.length === 1 ||
        applications.every((app) => app.email === email);
    }
  }

  return (
    <RegisterPageClient program={program} email={email} lockEmail={lockEmail} />
  );
}
