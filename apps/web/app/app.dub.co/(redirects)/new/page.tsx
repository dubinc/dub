import { getWorkspaces } from "@/lib/fetchers";
import { redirect } from "next/navigation";

export default async function NewLinkPage() {
  const projects = await getWorkspaces();
  if (!projects || projects.length === 0) {
    redirect("/?newProject=true");
  }
  redirect(`/${projects[0].slug}?newLink=true`);
}
