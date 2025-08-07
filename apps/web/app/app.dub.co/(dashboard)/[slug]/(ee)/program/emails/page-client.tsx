"use client";

import useProgramEmails from "@/lib/swr/use-program-emails";
import useProgramEmailsCount from "@/lib/swr/use-program-emails-count";
import { programEmailsGroupedCountSchema } from "@/lib/zod/schemas/program-emails";
import { z } from "zod";

export function ProgramEmailsPageClient() {
  const { emails, loading } = useProgramEmails();

  const { count, loading: countLoading } = useProgramEmailsCount<
    z.infer<typeof programEmailsGroupedCountSchema>
  >({
    query: { groupBy: "type" },
  });

  return (
    <div>
      {loading ? "Loading..." : JSON.stringify(emails)}
      <br />
      {countLoading ? "Count loading..." : JSON.stringify(count)}
    </div>
  );
}
