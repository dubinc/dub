import { submittedLeadFormSchema } from "@/lib/zod/schemas/submitted-lead-form";
import * as z from "zod/v4";

// Returns the group's lead form only when partners in the group can submit leads
export function getGroupSubmittedLeadForm(
  group:
    | {
        submittedLeadFormData?: unknown;
        submittedLeadsEnabledAt?: Date | string | null;
      }
    | null
    | undefined,
): z.infer<typeof submittedLeadFormSchema> | null {
  if (!group?.submittedLeadsEnabledAt || !group.submittedLeadFormData) {
    return null;
  }

  const parsed = submittedLeadFormSchema.safeParse(group.submittedLeadFormData);

  return parsed.success ? parsed.data : null;
}
