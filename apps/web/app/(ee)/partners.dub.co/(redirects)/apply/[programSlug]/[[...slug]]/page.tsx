import { redirect } from "next/navigation";

export default async function OldApplyPage(props: {
  params: Promise<{ programSlug: string; slug: string[] }>;
}) {
  const params = await props.params;
  const { programSlug, slug } = params;
  if (slug && slug.includes("application")) {
    redirect(
      `/${programSlug}/apply${slug.includes("success") ? "/success" : ""}`,
    );
  }

  redirect(`/${programSlug}`);
}
