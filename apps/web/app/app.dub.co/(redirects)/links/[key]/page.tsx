import { getDefaultWorkspace } from "@/lib/fetchers";
import { redirect } from "next/navigation";

export default async function OldLinksStatsPage(props: {
  params: Promise<{
    key: string;
  }>;
}) {
  const params = await props.params;
  const defaultWorkspace = await getDefaultWorkspace();
  if (!defaultWorkspace) {
    redirect("/");
  }
  redirect(
    `/${defaultWorkspace.slug}/analytics?domain=dub.sh&key=${params.key}`,
  );
}
