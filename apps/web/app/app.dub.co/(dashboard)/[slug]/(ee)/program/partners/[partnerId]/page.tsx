import { redirect } from "next/navigation";

export default async function ProgramPartnerPage({
  params,
}: {
  params: Promise<{ slug: string; partnerId: string }>;
}) {
  const { slug, partnerId } = await params;

  redirect(`/${slug}/program/partners/${partnerId}/links`);
}
