import { redirect } from "next/navigation";

export default function OldWorkspaceTags({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  redirect(`/${params.slug}/settings/library/tags`);
}
