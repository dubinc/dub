import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

// check if the tenantId already exists for a different enrolled partner
// if so, throw an error
export const throwIfExistingTenantEnrollmentExists = async ({
  tenantId,
  programId,
}: {
  tenantId: string;
  programId: string;
}) => {
  const existingTenantEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      tenantId_programId: {
        tenantId,
        programId,
      },
    },
  });

  if (existingTenantEnrollment) {
    throw new DubApiError({
      message: `The tenantId '${tenantId}' is already in associated with another partner in this program.`,
      code: "conflict",
    });
  }
};
