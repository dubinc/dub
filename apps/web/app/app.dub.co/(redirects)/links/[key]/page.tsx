import { getDefaultWorkspace } from "@/lib/fetchers";
import { SHORT_DOMAIN } from "@dub/utils/src";
import { redirect } from "next/navigation";

export default async function OldLinksStatsPage({
  params,
}: {
  params: {
    key: string;
  };
}) {
  const defaultWorkspace = await getDefaultWorkspace();
  if (!defaultWorkspace) {
    redirect("/");
  }
  redirect(
    `/${defaultWorkspace.slug}/analytics?domain=${SHORT_DOMAIN}&key=${params.key}`,
  );
}
