import { getDefaultWorkspace } from "@/lib/fetchers";
import { redirect } from "next/navigation";

export default async function NewLinkPage() {
  const defaultWorkspace = await getDefaultWorkspace();
  if (!defaultWorkspace) {
    redirect("/?newWorkspace=true");
  }
  redirect(`/${defaultWorkspace.slug}?newLink=true`);
}
