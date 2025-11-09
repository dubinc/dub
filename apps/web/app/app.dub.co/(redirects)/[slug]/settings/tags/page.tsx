import { redirect } from "next/navigation";

export default async function OldWorkspaceTags(props: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const params = await props.params;
  redirect(`/${params.slug}/settings/library/tags`);
}
