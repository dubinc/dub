import { redirect } from "next/navigation";

export default function OldApplyPage({
  params,
}: {
  params: { programSlug: string; slug: string[] };
}) {
  const { programSlug, slug } = params;
  if (slug && slug.includes("application")) {
    redirect(
      `/${programSlug}/apply${slug.includes("success") ? "/success" : ""}`,
    );
  }

  redirect(`/${programSlug}`);
}
