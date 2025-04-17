import { PageContent } from "@/ui/layout/page-content";
import { MaxWidthWrapper } from "@dub/ui";
import { redirect } from "next/navigation";
import { ProgramCustomerPageClient } from "./page-client";

export default function ProgramCustomer({
  params,
}: {
  params: { programSlug: string; customerId: string };
}) {
  if (params.programSlug === "framer") {
    redirect("/programs/framer");
  }
  return (
    <PageContent hideReferButton>
      <MaxWidthWrapper className="flex flex-col gap-6">
        <ProgramCustomerPageClient />
      </MaxWidthWrapper>
    </PageContent>
  );
}
