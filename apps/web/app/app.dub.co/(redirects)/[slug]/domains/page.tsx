import { redirect } from "next/navigation";

export default function OldWorkspaceDomains({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  redirect(`/${params.slug}/settings/domains`);
}
