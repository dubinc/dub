import { redirect } from "next/navigation";

export default async function OldDomainsPage({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  redirect(`/${params.slug}/settings/domains`);
}
