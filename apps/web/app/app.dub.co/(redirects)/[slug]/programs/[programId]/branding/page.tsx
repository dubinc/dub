import { redirect } from "next/navigation";

export default async function OldProgramBrandingPage(
  props: {
    params: Promise<{
      slug: string;
      programId: string;
    }>;
  }
) {
  const params = await props.params;
  redirect(`/${params.slug}/programs/${params.programId}/settings/branding`);
}
