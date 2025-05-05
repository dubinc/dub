import { getDefaultWorkspace } from "@/lib/fetchers";
import { redirect } from "next/navigation";

export default async function OldLinksAnalytics(
  props: {
    searchParams: Promise<{ [key: string]: string }>;
  }
) {
  const searchParams = await props.searchParams;
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
