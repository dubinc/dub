import { transformCustomer } from "@/lib/api/customers/transform-customer";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { generateRandomName } from "@/lib/names";
import { PartnerProfileCustomerSchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/:programId/customers/:customerId – Get a customer by ID
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const { customerId, programId } = params;

  const { program } = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: programId,
  });

  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
    include: {
      link: {
        include: {
          programEnrollment: {
            include: {
              partner: true,
              program: true,
            },
          },
        },
      },
    },
  });

  if (
    !customer ||
    ![
      customer?.link?.programEnrollment?.programId,
      customer?.link?.programEnrollment?.program.slug,
    ].includes(program.id)
  ) {
    throw new DubApiError({
      code: "not_found",
      message:
        "Customer not found. Make sure you're using the correct customer ID (e.g. `cus_3TagGjzRzmsFJdH8od2BNCsc`).",
    });
  }

  customer.avatar = null;
  customer.email;

  return NextResponse.json(
    PartnerProfileCustomerSchema.parse(
      transformCustomer({
        ...customer,
        email: customer.email || customer.name || generateRandomName(),
        link: customer.link
          ? {
              ...customer.link,
              programEnrollment: customer.link.programEnrollment
                ? { ...customer.link.programEnrollment, program: undefined }
                : null,
            }
          : null,
      }),
    ),
  );
});
