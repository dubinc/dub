import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { NETWORK_PROGRAM_ID, NETWORK_PROGRAM_SLUG } from "@dub/utils";
import { DubApiError } from "../errors";

export async function getEarningsProgramId({
  partnerId,
  programIdOrSlug,
}: {
  partnerId: string;
  programIdOrSlug?: string;
}) {
  if (!programIdOrSlug) {
    return undefined;
  }

  if (
    [
      NETWORK_PROGRAM_ID.toLowerCase(),
      NETWORK_PROGRAM_SLUG.toLowerCase(),
    ].includes(programIdOrSlug.toLowerCase())
  ) {
    throw new DubApiError({
      code: "not_found",
      message: "Program not found.",
    });
  }

  const { programId } = await getProgramEnrollmentOrThrow({
    partnerId,
    programId: programIdOrSlug,
    include: {},
  });

  return programId;
}

// Commission.programId filter for one program, or for all programs except the network program
export function getEarningsProgramFilter(programId?: string) {
  return programId ?? { not: NETWORK_PROGRAM_ID };
}
