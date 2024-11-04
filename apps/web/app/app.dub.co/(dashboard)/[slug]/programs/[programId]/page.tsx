import { redirect } from "next/navigation";

export default function ProgramInfo({
  params,
}: {
  params: { slug: string; programId: string };
}) {
  redirect(`/${params.slug}/programs/${params.programId}/overview`);
  return null;
}
