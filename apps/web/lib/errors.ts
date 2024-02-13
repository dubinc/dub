import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { generateErrorMessage } from "zod-error";

import z from "./zod";

const ErrorCode = z.enum([
  "bad_request",
  "not_found",
  "internal_server_error",
  "unauthorized",
  "forbidden",
  "rate_limit_exceeded",
  "invite_expired",
  "invite_pending",
  "exceeded_limit",
  "conflict",
  "unprocessible_entity",
]);

const errorCodeToHttpStatus: Record<z.infer<typeof ErrorCode>, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  exceeded_limit: 403,
  not_found: 404,
  conflict: 409,
  invite_pending: 409,
  invite_expired: 410,
  unprocessible_entity: 422,
  rate_limit_exceeded: 429,
  internal_server_error: 500,
};

const prismaErrorMapping: Record<
  PrismaClientKnownRequestError["code"],
  ErrorResponse["error"]["code"]
> = {
  P2025: "not_found",
  P2002: "conflict",
};

const ErrorSchema = z.object({
  error: z.object({
    code: ErrorCode.openapi({
      description: "A short code indicating the error code returned.",
      example: "not_found",
    }),
    message: z.string().openapi({
      description: "A human readable error message.",
      example: "The requested resource was not found.",
    }),
    doc_url: z.string().optional().openapi({
      description: "A URL to more information about the error code reported.",
      example: "https://dub.co/docs/api-reference",
    }),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorSchema>;

export class DubApiError extends Error {
  public readonly code: z.infer<typeof ErrorCode>;
  public readonly docUrl?: string;

  constructor({
    code,
    message,
    docUrl,
  }: {
    code: z.infer<typeof ErrorCode>;
    message: string;
    docUrl?: string;
  }) {
    super(message);
    this.code = code;
    this.docUrl = docUrl ?? `${docErrorUrl}#${code}`;
  }
}

const docErrorUrl = "https://dub.co/docs/api-reference/errors";

export function fromZodError(error: ZodError): ErrorResponse {
  return {
    error: {
      code: "bad_request",
      message: generateErrorMessage(error.issues, {
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
      doc_url: `${docErrorUrl}#bad_request`,
    },
  };
}

export function handleApiError(error: any): ErrorResponse & { status: number } {
  console.error(error);

  // Zod errors
  if (error instanceof ZodError) {
    return { ...fromZodError(error), status: 400 };
  }

  // Prisma errors
  if (error instanceof PrismaClientKnownRequestError) {
    const code = prismaErrorMapping[error.code] ?? error.message;

    return {
      error: {
        code,
        message: error.message,
        doc_url: `${docErrorUrl}#${code}`,
      },
      status: errorCodeToHttpStatus[code],
    };
  }

  // DubApiError errors
  if (error instanceof DubApiError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        doc_url: error.docUrl,
      },
      status: errorCodeToHttpStatus[error.code],
    };
  }

  // Fallback
  return {
    error: {
      code: "internal_server_error",
      message: error instanceof Error ? error.message : "Internal Server Error",
      doc_url: `${docErrorUrl}#internal_server_error`,
    },
    status: 500,
  };
}

export function handleAndReturnErrorResponse(
  err: unknown,
  headers?: Record<string, string>,
) {
  const { error, status } = handleApiError(err);
  return NextResponse.json<ErrorResponse>({ error }, { headers, status });
}

export const errorSchemaFactory = (code: z.infer<typeof ErrorCode>) => {
  return z.object({
    error: z.object({
      code: z.literal(code).openapi({
        description: "A short code indicating the error code returned.",
        example: code,
      }),
      message: z.string().openapi({
        description: "A human readable explanation of what went wrong.",
        example: "The requested resource was not found.",
      }),
      doc_url: z
        .string()
        .optional()
        .openapi({
          description:
            "A link to our documentation with more details about this error code",
          example: `${docErrorUrl}#${code}`,
        }),
    }),
  });
};
