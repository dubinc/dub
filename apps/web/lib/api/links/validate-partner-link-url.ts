import { ProgramProps } from "@/lib/types";
import { getApexDomain } from "@dub/utils";
import { DubApiError } from "../errors";

export const validatePartnerLinkUrl = ({
  program,
  url,
}: {
  program: Pick<ProgramProps, "urlValidationMode" | "url">;
  url?: string | null;
}) => {
  if (!url || !program.url) {
    return;
  }

  if (
    program.urlValidationMode === "domain" &&
    getApexDomain(url) !== getApexDomain(program.url)
  ) {
    throw new DubApiError({
      code: "bad_request",
      message: `The provided URL domain (${getApexDomain(url)}) does not match the program's domain (${getApexDomain(program.url)}).`,
    });
  } else if (program.urlValidationMode === "exact" && url !== program.url) {
    throw new DubApiError({
      code: "bad_request",
      message: `The provided URL (${url}) does not match the program's URL (${program.url}).`,
    });
  }

  return true;
};
