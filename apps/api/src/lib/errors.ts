import { Prisma } from "@dub/database";
import { z } from "@hono/zod-openapi";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { generateErrorMessage } from "zod-error";

const ErrorCode = z.enum([
  "not_found",
  "internal_server_error",
  "unauthorized",
  "bad_request",
  "forbidden",
]);

const prismaErrorMapping: Record<
  Prisma.PrismaClientKnownRequestError["code"],
  ErrorResponse["error"]["code"]
> = {
  P2025: "not_found",
};

const errorCodeToHttpStatus: Record<z.infer<typeof ErrorCode>, number> = {
  bad_request: 400,
  not_found: 404,
  internal_server_error: 500,
  unauthorized: 401,
  forbidden: 403,
};

const ErrorSchema = z.object({
  error: z.object({
    code: ErrorCode.openapi({
      description: "A machine readable error code.",
      example: "bad_request",
    }),
    message: z.string().openapi({
      description: "A human readable error message.",
    }),
    doc_url: z.string().optional().openapi({
      description: "A link to our doc with more details about this error code",
      example: "https://dub.co/docs/api-reference",
    }),
  }),
});

export const toOpenAPIErrorSchema = (code: z.infer<typeof ErrorCode>) => {
  return z.object({
    error: z.object({
      code: ErrorCode.openapi({
        description: "A machine readable error code.",
        example: code
      }),
      message: z.string().openapi({
        description: "A human readable error message.",
      }),
      doc_url: z.string().optional().openapi({
        description:
          "A link to our doc with more details about this error code",
        example: "https://dub.co/docs/api-reference",
      }),
    }),
  });
};

export type ErrorResponse = z.infer<typeof ErrorSchema>;

// Convert ZodError to JSON Error response format
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
          code: "bad_request",
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

// Handle other errors to JSON Error response format
export function handleError(error: Error, c: Context): Response {
  console.error("An error occurred", error);

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return c.json<ErrorResponse>(
      {
        error: {
          code: prismaErrorMapping[error.code] ?? "internal_server_error",
          doc_url: "https://dub.co/docs/api-reference",
          message: error.message,
        },
      },
      { status: 400 },
    );
  }

  // Handle DubApiError errors
  if (error instanceof DubApiError) {
    return c.json<ErrorResponse>(
      {
        error: {
          code: error.code,
          doc_url: "https://dub.co/docs/api-reference",
          message: error.message,
        },
      },
      { status: error.status },
    );
  }

  // Handle other errors
  return c.json<ErrorResponse>(
    {
      error: {
        code: "internal_server_error",
        doc_url: "https://dub.co/docs/api-reference",
        message: "Something went wrong. Please try again.",
      },
    },
    { status: 500 },
  );
}

export class DubApiError extends HTTPException {
  public readonly code: z.infer<typeof ErrorCode>;

  constructor({
    code,
    message,
  }: {
    code: z.infer<typeof ErrorCode>;
    message: string;
  }) {
    super(errorCodeToHttpStatus[code], { message });
    this.code = code;
  }
}
