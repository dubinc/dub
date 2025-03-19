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
    const errors = Object.values(error.validationErrors).flat();

    return errors.join(", ");
  }

  return fallback || "An unknown error occurred.";
};
