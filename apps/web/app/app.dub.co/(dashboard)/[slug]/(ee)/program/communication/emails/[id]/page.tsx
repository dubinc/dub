import { ProgramEmailPageClient } from "./page-client";

export default function ProgramEmailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return <ProgramEmailPageClient id={id} />;
}
