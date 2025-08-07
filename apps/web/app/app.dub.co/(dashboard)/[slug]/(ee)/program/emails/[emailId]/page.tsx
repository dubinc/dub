import { ProgramEmailPageClient } from "./page-client";

export default function ProgramEmailPage({
  params,
}: {
  params: { emailId: string };
}) {
  const { emailId } = params;

  return <ProgramEmailPageClient emailId={emailId} />;
}
