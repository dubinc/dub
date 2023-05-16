import prisma from "@/lib/prisma";
import PlaceholderContent from "./placeholder";

export async function generateMetadata({
  params,
}: {
  params: { domain: string };
}) {
  const title = `${params.domain.toUpperCase()} - A Dub.sh Custom Domain`;
  const description = `${params.domain.toUpperCase()} is a custom domain on Dub - an open-source link management tool for modern marketing teams to create, share, and track short links.`;

  return {
    title,
    description,
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@dubdotsh",
    },
  };
}

export async function generateStaticParams() {
  const domains =
    process.env.VERCEL_ENV === "production"
      ? await prisma.domain.findMany({
          where: {
            verified: true,
            target: null,
          },
          select: {
            slug: true,
          },
        })
      : [];
  return domains.map(({ slug: domain }) => ({
    domain,
  }));
}

export default function CustomDomainPage() {
  return <PlaceholderContent />;
}
