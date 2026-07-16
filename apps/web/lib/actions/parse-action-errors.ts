import { ValidationErrors } from "next-safe-action";

export const parseActionError = (
  error: {
    serverError?: string;
    validationErrors?: ValidationErrors<any>;
  },
  fallback?: string,
) => {
  if (error.serverError) {
    return error.serverError;
  }

  if (error.validationErrors) {
    // Return only the first error — Sonner toasts don't preserve newlines, so
    // joining multiple messages into one string reads poorly as a single line.
    if (error.validationErrors._errors?.length) {
      return error.validationErrors._errors[0];
    }

    console.error("validationErrors", error.validationErrors);

    for (const value of Object.values(error.validationErrors)) {
      const message = (value as { _errors?: string[] })?._errors?.[0];

      if (message) {
        return message;
      }
    }
  }

  return fallback || "An unknown error occurred.";
};
