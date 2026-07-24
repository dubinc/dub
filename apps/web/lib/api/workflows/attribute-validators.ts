import { throwIfInvalidGroupIds } from "@/lib/api/groups/throw-if-invalid-group-ids";
import { DubApiError } from "../errors";

export type WorkflowAttributeValidatorContext = {
  programId: string;
  groupId?: string;
};

type WorkflowAttributeValidator = ({
  value,
  context,
}: {
  value: unknown;
  operator: string;
  context: WorkflowAttributeValidatorContext;
}) => Promise<void>;

export const WORKFLOW_ATTRIBUTE_VALIDATORS: Partial<
  Record<string, WorkflowAttributeValidator>
> = {
  partnerGroup: async ({ value, context }) => {
    const groupIds = normalizeStringArray(value);

    if (groupIds.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message: "Please select at least one group.",
      });
    }

    if (context.groupId && groupIds.includes(context.groupId)) {
      throw new DubApiError({
        code: "bad_request",
        message: "Cannot select the current group as a source group.",
      });
    }

    await throwIfInvalidGroupIds({
      programId: context.programId,
      groupIds,
    });
  },
};

const normalizeStringArray = (value: unknown): string[] => {
  if (typeof value === "string") {
    return value ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
  }

  return [];
};
