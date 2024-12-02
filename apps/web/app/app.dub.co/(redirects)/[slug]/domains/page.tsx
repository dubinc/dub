import { redirect } from "next/navigation";
import { use } from "react";

export default function OldWorkspaceDomains({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  redirect(`/${slug}/settings/domains`);
}
