import { redirect } from "next/navigation";

export default function OldProgramBrandingPage({
  params,
}: {
  params: {
    slug: string;
    programId: string;
  };
}) {
  redirect(`/${params.slug}/programs/${params.programId}/settings/branding`);
}
