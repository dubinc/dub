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
    if (error.validationErrors._errors) {
      return error.validationErrors._errors;
    }
    console.log("error.validationErrors", error.validationErrors);

    return Object.entries(error.validationErrors)
      .map(([_key, value]) => {
        return (value as { _errors: string[] })._errors;
      })
      .join("\n");
  }

  return fallback || "An unknown error occurred.";
};
