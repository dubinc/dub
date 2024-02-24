import { getProjects } from "@/lib/fetchers";
import { redirect } from "next/navigation";

export default async function NewLinkPage() {
  const projects = await getProjects();
  if (!projects || projects.length === 0) {
    redirect("/?newProject=true");
  }
  redirect(`/${projects[0].slug}?newLink=true`);
}
