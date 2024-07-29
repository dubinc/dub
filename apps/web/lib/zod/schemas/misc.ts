import { plans, roles } from "@/lib/types";
import z from "@/lib/zod";

export const planSchema = z.enum(plans).describe("The plan of the workspace.");

export const roleSchema = z
  .enum(roles)
  .describe("The role of the authenticated user in the workspace.");

// A boolean query schema that coerces the value to a boolean
export const booleanQuerySchema = z
  .enum(["true", "false"])
  .transform((value) => value == "true")
  .openapi({
    type: "boolean",
  });

// Pagination
export const getPaginationQuerySchema = ({ pageSize }: { pageSize: number }) =>
  z.object({
    page: z.coerce
      .number({ invalid_type_error: "Page must be a number." })
      .positive({ message: "Page must be greater than 0." })
      .optional()
      .default(1)
      .describe("The page number for pagination.")
      .openapi({
        example: 1,
      }),
    pageSize: z.coerce
      .number({ invalid_type_error: "Page size must be a number." })
      .positive({ message: "Page size must be greater than 0." })
      .max(pageSize, {
        message: `Max page size is ${pageSize}.`,
      })
      .optional()
      .default(pageSize)
      .describe("The number of items per page.")
      .openapi({
        example: 50,
      }),
  });
