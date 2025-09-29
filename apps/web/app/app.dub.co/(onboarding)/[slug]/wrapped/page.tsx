import { redirect } from "next/navigation";

export default async function WrappedParentPage(
  props: {
    params: Promise<{ slug: string }>;
  }
) {
  const params = await props.params;
  redirect(`/${params.slug}/wrapped/2024`);
}
