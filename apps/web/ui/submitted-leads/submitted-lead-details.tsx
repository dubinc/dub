import { SubmittedLeadFormDataField, SubmittedLeadProps } from "@/lib/types";
import { formatFormDataValue } from "./submitted-lead-utils";

interface SubmittedLeadDetailsProps {
  lead: Pick<SubmittedLeadProps, "formData">;
}

export function SubmittedLeadDetails({ lead }: SubmittedLeadDetailsProps) {
  const formData = lead.formData as
    | SubmittedLeadFormDataField[]
    | null
    | undefined;

  // Don't show fields with null/undefined/empty/NaN values (avoid displaying "null")
  const displayFormData = formData?.filter((field) => {
    const v = field.value;
    if (v === undefined || v === null || v === "") return false;
    if (typeof v === "number" && Number.isNaN(v)) return false;
    return true;
  });

  return (
    <div className="grid grid-cols-1 gap-4 text-sm text-neutral-600">
      {displayFormData?.map((field) => (
        <div key={field.key}>
          <div className="text-content-default text-sm font-semibold">
            {field.label}
          </div>
          <div className="text-content-default whitespace-pre-line text-wrap text-sm">
            {formatFormDataValue(field.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
