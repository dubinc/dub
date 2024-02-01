import { ZodError } from "zod";
import { generateErrorMessage } from "zod-error";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

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
]);

const errorCodeToHttpStatus: Record<z.infer<typeof ErrorCode>, number> = {
  bad_request: 400,
  not_found: 404,
  internal_server_error: 500,
  unauthorized: 401,
  forbidden: 403,
  rate_limit_exceeded: 429,
  invite_expired: 410,
  invite_pending: 409,
  exceeded_limit: 403,
  conflict: 409,
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

  constructor({
    code,
    message,
  }: {
    code: z.infer<typeof ErrorCode>;
    message: string;
  }) {
    super(message);
    this.code = code;
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

export function handleApiError(
  error: unknown,
): ErrorResponse & { status: number } {
  // Zod errors
  if (error instanceof ZodError) {
    return { ...fromZodError(error), status: 400 };
  }

  // Prisma errors
  if (error instanceof PrismaClientKnownRequestError) {
    const code = prismaErrorMapping[error.code] ?? "internal_server_error";

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
        doc_url: `${docErrorUrl}#${error.code}`,
      },
      status: errorCodeToHttpStatus[error.code],
    };
  }

  // Fallback
  return {
    error: {
      code: "internal_server_error",
      message: "Something went wrong. Please try again.",
      doc_url: `${docErrorUrl}#internal_server_error`,
    },
    status: 500,
  };
}
