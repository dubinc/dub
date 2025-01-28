import { isValidDomain } from "./domains";
import { DubApiError } from "./errors";

const MAX_HOSTNAMES_ALLOWED = 10;

export const validateAllowedHostnames = async (
  allowedHostnames: string[] | undefined,
) => {
  if (!allowedHostnames) {
    return [];
  }

  allowedHostnames = [...new Set(allowedHostnames)];

  const results = await Promise.all(
    allowedHostnames.map((hostname) => isValidDomain(hostname)),
  );

  const invalidHostnames = results.filter((result) => !result);

  if (invalidHostnames.length > 0) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: "Invalid hostnames.",
    });
  }

  if (allowedHostnames && allowedHostnames.length > MAX_HOSTNAMES_ALLOWED) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: `Maximum of ${MAX_HOSTNAMES_ALLOWED} hostnames allowed.`,
    });
  }

  return allowedHostnames;
};
