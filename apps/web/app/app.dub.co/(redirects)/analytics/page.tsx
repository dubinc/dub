import { getDefaultWorkspace } from "@/lib/fetchers";
import { redirect } from "next/navigation";

export default async function OldLinksAnalytics({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; key?: string }>;
}) {
  const { domain, key } = await searchParams;

  const defaultWorkspace = await getDefaultWorkspace();
  if (!defaultWorkspace) {
    redirect("/");
  }

  const newParams = new URLSearchParams();
  if (domain) {
    newParams.set("domain", domain);
  }
  if (key) {
    newParams.set("key", key);
  }
  const queryString = newParams.toString();

  redirect(
    `/${defaultWorkspace.slug}/analytics${queryString ? `?${queryString}` : ""}`,
  );
}
