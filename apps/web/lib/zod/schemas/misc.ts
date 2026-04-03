import { plans } from "@/lib/types";
import { WorkspaceRole } from "@dub/prisma/client";
import * as z from "zod/v4";

export const RECURRING_MAX_DURATIONS = [0, 1, 3, 6, 12, 18, 24, 36, 48];

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

export const maxDurationSchema = z.coerce
  .number()
  .refine((val) => RECURRING_MAX_DURATIONS.includes(val), {
    message: `Max duration must be ${RECURRING_MAX_DURATIONS.join(", ")}`,
  })
  .nullish();
