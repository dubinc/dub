import { redirect } from "next/navigation";

export default async function OldWorkspaceDomains(
  props: {
    params: Promise<{
      slug: string;
    }>;
  }
) {
  const params = await props.params;
  redirect(`/${params.slug}/settings/domains`);
}
