import { Lock } from "@/ui/shared/icons";
import { NewBackground } from "@/ui/shared/new-background";
import { prismaEdge } from "@dub/prisma/edge";
import { BlurImage, Wordmark } from "@dub/ui";
import { constructMetadata, createHref, isDubDomain } from "@dub/utils";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PasswordForm from "./form";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const title = "Password Required";
const description =
  "This link is password protected. Enter the password to view it.";
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
    <>
      <NewBackground />
      <main className="relative mb-10 flex w-screen flex-col items-center">
        <Wordmark className="mt-6 h-8" />
        <div className="z-10 mt-8 w-full max-w-[400px] overflow-hidden rounded-2xl border border-neutral-200 shadow-sm md:mt-24">
          <div className="flex flex-col items-center justify-center gap-3 border-b border-neutral-200 bg-white px-4 py-6 text-center">
            {link.project?.logo ? (
              <BlurImage
                src={link.project.logo}
                alt={link.project.name}
                width={48}
                height={48}
                className="size-12 rounded-full"
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100">
                <Lock className="size-4 text-neutral-600" />
              </div>
            )}
            <h3 className="mt-1 text-lg font-semibold">Password required</h3>
            <p className="w-full max-w-xs text-pretty text-sm text-neutral-500">
              {description}
            </p>
          </div>
          <PasswordForm />
        </div>
        <Link
          href={createHref("/home", link.domain, {
            utm_source: "Password Protected Link",
            utm_medium: "Link Password Page",
            utm_campaign: link.domain,
            utm_content: "What is Dub?",
          })}
          target="_blank"
          className="mt-4 block text-sm font-medium text-neutral-600 underline transition-colors duration-75 hover:text-neutral-800"
        >
          What is Dub?
        </Link>
      </main>
    </>
  );
}
