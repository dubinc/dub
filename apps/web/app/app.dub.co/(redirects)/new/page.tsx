import { getWorkspaces } from "@/lib/fetchers";
import { redirect } from "next/navigation";

export default async function NewLinkPage() {
  const workspaces = await getWorkspaces();
  if (!workspaces || workspaces.length === 0) {
    redirect("/?newWorkspace=true");
  }
  redirect(`/${workspaces[0].slug}?newLink=true`);
}
