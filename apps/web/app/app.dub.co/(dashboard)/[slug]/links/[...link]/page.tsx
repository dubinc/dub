import { notFound } from "next/navigation";
import { LinkPageClient } from "./page-client";

export default function LinkPage({
  params,
}: {
  params: {
    slug: string;
    link: string | string[];
  };
}) {
  const linkParts = Array.isArray(params.link) ? params.link : null;
  if (!linkParts) notFound();

  const domain = linkParts[0];
  const key = linkParts.length > 1 ? linkParts.slice(1).join("/") : "_root";

  return <LinkPageClient domain={domain} slug={key} />;
}
