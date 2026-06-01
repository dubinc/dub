import { DubApiError } from "@/lib/api/errors";
import { Link, Program } from "@dub/prisma/client";

interface PartnerUserAccess {
  assignedPrograms: Pick<Program, "id" | "slug">[] | undefined;
  assignedLinks: Pick<Link, "id">[] | undefined;
}

export function throwIfNoProgramAccess({
  programId,
  programSlug,
  partnerUser,
}: {
  programId?: string;
  programSlug?: string;
  partnerUser: Partial<Pick<PartnerUserAccess, "assignedPrograms">>;
}) {
  if (
    programId &&
    partnerUser.assignedPrograms &&
    !partnerUser.assignedPrograms.some(({ id }) => id === programId)
  ) {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not authorized to view this program.",
    });
  }

  if (
    programSlug &&
    partnerUser.assignedPrograms &&
    !partnerUser.assignedPrograms.some(({ slug }) => slug === programSlug)
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
  partnerUser: Partial<Pick<PartnerUserAccess, "assignedLinks">>;
}) {
  if (
    linkId &&
    partnerUser.assignedLinks &&
    !partnerUser.assignedLinks.some(({ id }) => id === linkId)
  ) {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not authorized to view this link.",
    });
  }
}
