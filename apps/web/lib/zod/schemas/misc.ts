import { plans } from "@/lib/types";
import { WorkspaceRole } from "@dub/prisma/client";
import * as z from "zod/v4";

export const RECURRING_MAX_DURATIONS = [0, 1, 3, 6, 12, 24];
export const MAX_DURATION_LIMIT = 600;

export const maxDurationSchema = z.coerce
  .number()
  .int({ message: "Max duration must be an integer." })
  .nonnegative({ message: "Max duration must be 0 or greater." })
  .max(MAX_DURATION_LIMIT, {
    message: "Max duration must be 600 months (50 years) or less.",
  })
  .nullish();

export const planSchema = z.enum(plans).describe("The plan of the workspace.");

export const roleSchema = z
  .enum(WorkspaceRole)
  .describe("The role of the authenticated user in the workspace.");

export const booleanQuerySchema = z
  .stringbool({
    truthy: ["true"],
    falsy: ["false"],
  })
  .meta({
    type: "boolean",
  });

// Pagination
export const getPaginationQuerySchema = ({
  pageSize,
  deprecated = false,
}: {
  pageSize: number;
  deprecated?: boolean;
}) => ({
  page: z.coerce
    .number({ error: "Page must be a number." })
    .positive({ message: "Page must be greater than 0." })
    .optional()
    .describe(
      deprecated
        ? "DEPRECATED. Use `startingAfter` instead."
        : "The page number for pagination.",
    )
    .meta({
      example: 1,
      deprecated,
    }),
  pageSize: z.coerce
    .number({ error: "Page size must be a number." })
    .positive({ message: "Page size must be greater than 0." })
    .max(pageSize, {
      message: `Max page size is ${pageSize}.`,
    })
    .optional()
    .default(pageSize)
    .describe("The number of items per page.")
    .meta({
      example: 50,
    }),
});

// Cursor-based pagination
export const getCursorPaginationQuerySchema = ({
  example,
}: {
  example: string;
}) => ({
  endingBefore: z
    .string()
    .optional()
    .describe(
      "If specified, the query only searches for results before this cursor. Mutually exclusive with `startingAfter`.",
    )
    .meta({
      example,
    }),
  startingAfter: z
    .string()
    .optional()
    .describe(
      "If specified, the query only searches for results after this cursor. Mutually exclusive with `endingBefore`.",
    )
    .meta({
      example,
    }),
});
