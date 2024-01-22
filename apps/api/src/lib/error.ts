import { z } from "@hono/zod-openapi";
import { Context } from "hono";
import { ZodError } from "zod";
import { generateErrorMessage } from "zod-error";

const ErrorCode = z.enum(["invalid_request"]);

const ErrorSchema = z.object({
  error: z.object({
    code: ErrorCode.openapi({
      description: "A machine readable error code.",
      example: "invalid_request",
    }),
    message: z.string().openapi({
      description: "A human readable error message.",
    }),
    doc_url: z.string().openapi({
      description: "A link to our doc with more details about this error code",
      example: "https://dub.co/docs/api-reference",
    }),
  }),
});

type ErrorResponse = z.infer<typeof ErrorSchema>;

export function handleZodError(
  result:
    | {
        success: true;
        data: any;
      }
    | {
        success: false;
        error: ZodError;
      },
  c: Context,
) {
  if (!result.success) {
    return c.json<ErrorResponse>(
      {
        error: {
          code: "invalid_request",
          doc_url: "https://dub.co/docs/api-reference",
          message: generateErrorMessage(result.error.issues, {
            maxErrors: 1,
            delimiter: {
              component: ": ",
            },
            path: {
              enabled: true,
              type: "objectNotation",
              label: "",
            },
            code: {
              enabled: true,
              label: "",
            },
            message: {
              enabled: true,
              label: "",
            },
          }),
        },
      },
      { status: 400 },
    );
  }
}
