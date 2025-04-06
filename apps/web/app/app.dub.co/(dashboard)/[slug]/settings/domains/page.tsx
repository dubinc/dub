import { redirect } from "next/navigation";

export default function DomainsPage({ params }: { params: { slug: string } }) {
  redirect(`/${params.slug}/settings/domains/custom`);
}
