import { redirect } from "next/navigation";

export default async function WorkspaceRoot({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: Promise<Record<string, string>>;
}) {
  redirect(
    `/${params.slug}/links?${new URLSearchParams(await searchParams).toString()}`,
  );
}
