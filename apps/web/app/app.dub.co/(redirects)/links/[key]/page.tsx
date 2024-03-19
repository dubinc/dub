import { getWorkspaces } from "@/lib/fetchers";
import { redirect } from "next/navigation";

export default async function OldLinksStatsPage({
  params,
}: {
  params: {
    key: string;
  };
}) {
  const workspaces = await getWorkspaces();
  if (!workspaces || workspaces.length === 0) {
    redirect("/");
  }
  redirect(`/${workspaces[0].slug}/analytics?domain=dub.sh&key=${params.key}`);
}
