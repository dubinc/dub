import { NewBackground } from "@/ui/shared/new-background";
import { prismaEdge } from "@dub/prisma/edge";
import { BlurImage, Logo } from "@dub/ui";
import { constructMetadata, isDubDomain } from "@dub/utils";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PasswordForm from "./form";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const title = "Password Required";
const description =
  "This link is password protected. Please enter the password to view it.";
const image = "https://assets.dub.co/misc/password-protected.png";

export async function generateMetadata({
  params,
}: {
  params: { linkId: string };
}) {
  const link = await prismaEdge.link.findUnique({
    where: {
      id: params.linkId,
    },
    select: {
      domain: true,
      project: {
        select: {
          logo: true,
          plan: true,
        },
      },
    },
  });

  if (!link) {
    notFound();
  }

  return constructMetadata({
    title:
      isDubDomain(link.domain) || link.project?.plan === "free"
        ? `${title} - Dub.co`
        : title,
    description,
    image,
    ...(!isDubDomain(link.domain) &&
      link.project?.plan !== "free" &&
      link.project?.logo && {
        icons: link.project.logo,
      }),
    noIndex: true,
  });
}

export default async function PasswordProtectedLinkPage({
  params,
}: {
  params: { linkId: string };
}) {
  const link = await prismaEdge.link.findUnique({
    where: {
      id: params.linkId,
    },
    select: {
      id: true,
      domain: true,
      key: true,
      password: true,
      shortLink: true,
      project: {
        select: {
          name: true,
          logo: true,
          plan: true,
        },
      },
    },
  });

  if (!link) {
    notFound();
  }

  if (
    !link.password ||
    cookies().get(`dub_password_${link.id}`)?.value === link.password
  ) {
    redirect(link.shortLink);
  }

  return (
    <main className="flex h-screen w-screen items-center justify-center">
      <NewBackground />
      <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          {!isDubDomain(link.domain) &&
          link.project?.plan !== "free" &&
          link.project?.logo ? (
            <BlurImage
              src={link.project.logo}
              alt={link.project.name}
              width={20}
              height={20}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <a href="https://dub.co" target="_blank" rel="noreferrer">
              <Logo />
            </a>
          )}
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <PasswordForm />
      </div>
    </main>
  );
}
