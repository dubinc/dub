import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Stats from "#/ui/stats";

export async function generateMetadata({
  params,
}: {
  params: { domain: string; key: string };
}) {
  const data = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain: params.domain,
        key: params.key,
      },
    },
    select: {
      publicStats: true,
      url: true,
    },
  });

  if (!data || !data.publicStats) {
    return;
  }

  const title = `Stats for ${params.domain}/${params.key} - Dub`;
  const description = `Stats page for ${params.domain}/${params.key}, which redirects to ${data.url}.`;
  const image = `https://${params.domain}/api/og/stats?domain=${params.domain}&key=${params.key}`;

  return {
    title,
    description,
    image,
    twitter: {
      card: "summary_large_image",
      title,
      description,
      image,
      creator: "@dubdotsh",
    },
  };
}

export async function generateStaticParams() {
  const links =
    process.env.VERCEL_ENV === "production"
      ? await prisma.link.findMany({
          where: {
            publicStats: true,
            NOT: {
              id: "cl9knuml512583yhrbjk0k55yl", // omit `dub.sh/github` since it's already statically generated
            },
          },
          select: {
            domain: true,
            key: true,
          },
        })
      : [];

  return links.map(({ domain, key }) => ({
    domain,
    key,
  }));
}

export default async function StatsPage({
  params,
}: {
  params: { domain: string; key: string };
}) {
  const data = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain: params.domain,
        key: params.key,
      },
    },
    select: {
      publicStats: true,
    },
  });

  if (!data || !data.publicStats) {
    notFound();
  }

  return (
    <div className="bg-gray-50">
      <Stats staticDomain={params.domain} />
    </div>
  );
}
