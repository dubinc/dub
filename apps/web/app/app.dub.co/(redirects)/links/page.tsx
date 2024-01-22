import { getProjects } from "@/lib/fetchers";
import { redirect } from "next/navigation";

export default async function OldLinksPage() {
  const projects = await getProjects();
  if (!projects || projects.length === 0) {
    redirect("/");
  }
  redirect(`/${projects[0].slug}`);
}
