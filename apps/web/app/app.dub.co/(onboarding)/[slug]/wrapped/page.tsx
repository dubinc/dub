import { redirect } from "next/navigation";

export default function WrappedParentPage({
  params,
}: {
  params: { slug: string };
}) {
  redirect(`/${params.slug}/wrapped/2024`);
}
