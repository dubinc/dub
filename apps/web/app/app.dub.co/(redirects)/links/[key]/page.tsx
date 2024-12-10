import { getDefaultWorkspace } from "@/lib/fetchers";
import { redirect } from "next/navigation";

export default async function OldLinksStatsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;

  const defaultWorkspace = await getDefaultWorkspace();

  if (!defaultWorkspace) {
    redirect("/");
  }

  redirect(`/${defaultWorkspace.slug}/analytics?domain=dub.sh&key=${key}`);
}
