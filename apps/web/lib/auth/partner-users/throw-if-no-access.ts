import { DubApiError } from "@/lib/api/errors";

interface PartnerUserAccess {
  assignedProgramIds: string[] | undefined;
  assignedProgramSlugs: string[] | undefined;
  assignedLinkIds: string[] | undefined;
}

export function throwIfNoProgramAccess({
  programId,
  programSlug,
  partnerUser,
}: {
  programId?: string;
  programSlug?: string;
  partnerUser: Pick<
    PartnerUserAccess,
    "assignedProgramIds" | "assignedProgramSlugs"
  >;
}) {
  if (
    programId &&
    partnerUser.assignedProgramIds &&
    !partnerUser.assignedProgramIds.includes(programId)
  ) {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not authorized to view this program.",
    });
  }

  if (
    programSlug &&
    partnerUser.assignedProgramSlugs &&
    !partnerUser.assignedProgramSlugs.includes(programSlug)
  ) {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not authorized to view this program.",
    });
  }
}

export function throwIfNoLinkAccess({
  linkId,
  partnerUser,
}: {
  linkId: string | undefined | null;
  partnerUser: Pick<PartnerUserAccess, "assignedLinkIds">;
}) {
  if (
    linkId &&
    partnerUser.assignedLinkIds &&
    !partnerUser.assignedLinkIds.includes(linkId)
  ) {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not authorized to view this link.",
    });
  }
}
