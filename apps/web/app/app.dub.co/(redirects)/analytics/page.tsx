import { getProjects } from "@/lib/fetchers";
import { redirect } from "next/navigation";

export default async function OldLinksAnalytics({
  searchParams,
}: {
  searchParams: { [key: string]: string };
}) {
  const projects = await getProjects();
  if (!projects || projects.length === 0) {
    redirect("/");
  }

  const newParams = new URLSearchParams();
  if (searchParams.domain) {
    newParams.set("domain", searchParams.domain);
  }
  if (searchParams.key) {
    newParams.set("key", searchParams.key);
  }
  const queryString = newParams.toString();

  redirect(
    `/${projects[0].slug}/analytics${queryString ? `?${queryString}` : ""}`,
  );
}
