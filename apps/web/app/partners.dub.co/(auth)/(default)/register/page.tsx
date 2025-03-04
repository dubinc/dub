import { getProgram } from "@/lib/fetchers/get-program";
import { notFound } from "next/navigation";
import RegisterPageClient from "./page-client";

export default async function RegisterPage({
  params,
}: {
  params: { programSlug?: string };
}) {
  const { programSlug } = params;
  const program = programSlug
    ? (await getProgram({ slug: programSlug })) ?? undefined
    : undefined;

  if (programSlug && !program) notFound();

  return <RegisterPageClient program={program} />;
}
