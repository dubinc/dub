import { getDefaultWorkspace } from "@/lib/fetchers";
import { redirect } from "next/navigation";

export default async function OldLinksAnalytics({
  searchParams,
}: {
  searchParams: { [key: string]: string };
}) {
  const defaultWorkspace = await getDefaultWorkspace();
  if (!defaultWorkspace) {
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
    `/${defaultWorkspace.slug}/analytics${queryString ? `?${queryString}` : ""}`,
  );
}
