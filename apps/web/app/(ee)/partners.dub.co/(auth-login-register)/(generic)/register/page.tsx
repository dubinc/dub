import { SSO_LOGIN_PROGRAMS } from "@/lib/auth/sso-login-programs";
import { getProgram } from "@/lib/fetchers/get-program";
import { prisma } from "@dub/prisma";
import { constructMetadata } from "@dub/utils";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import RegisterPageClient from "./page-client";

export const metadata = constructMetadata({
  fullTitle: "Create your partners.dub.co account",
});

export default async function RegisterPage(props: {
  params: Promise<{ programSlug?: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { programSlug } = await props.params;
  let { email } = (await props.searchParams) as { email?: string };

  if (
    programSlug &&
    SSO_LOGIN_PROGRAMS.some(({ slug }) => slug === programSlug) &&
    !email // if email search param is present, don't redirect to login (need to create account)
  ) {
    redirect(`/${programSlug}/login`);
  }

  const program = programSlug
    ? (await getProgram({ slug: programSlug })) ?? undefined
    : undefined;

  if (programSlug && !program) {
    redirect("/register");
  }

  // if email search param is not present, check if there is a program application for the program
  // if so, use the email from the first application
  if (!email && program) {
    const cookieStore = await cookies();
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
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        })
      : [];

    if (applications.length) {
      email = applications[0].email;
    }
  }

  return (
    <RegisterPageClient
      program={program}
      email={email}
      lockEmail={email ? true : false}
    />
  );
}
