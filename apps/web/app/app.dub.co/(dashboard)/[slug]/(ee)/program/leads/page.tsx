import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { EditLeadFormButton } from "@/ui/submitted-leads/form-builder/edit-lead-form-button";
import { SubmittedLeadTable } from "@/ui/submitted-leads/submitted-lead-table";

export default function SubmittedLeadsPage() {
  return (
    <PageContent
      title="Submitted Leads"
      titleInfo={{
        title:
          "Review and manage leads submitted by your partners. [Learn more](https://dub.co/help/article/submitted-leads).",
      }}
      controls={<EditLeadFormButton />}
    >
      <PageWidthWrapper className="flex flex-col gap-3 pb-10">
        <SubmittedLeadTable />
      </PageWidthWrapper>
    </PageContent>
  );
}
