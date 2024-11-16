import { createDotsUser } from "@/lib/dots/create-dots-user";
import { retrieveDotsUser } from "@/lib/dots/retrieve-dots-user";
import { prisma } from "@/lib/prisma";
import { PartnerProps } from "@/lib/types";

export const enrollDotsUserApp = async ({
  partner,
  dotsAppId,
  programEnrollmentId,
}: {
  partner: PartnerProps;
  dotsAppId: string;
  programEnrollmentId: string;
}) => {
  if (!partner.dotsUserId) {
    console.warn(`Partner ${partner.id} has no Dots user ID`);
    return;
  }

  const dotsUser = await retrieveDotsUser(partner);

  const newDotsUser = await createDotsUser({
    dotsAppId, // we need to create a new Dots user under the Program's Dots App
    userInfo: {
      firstName: dotsUser.first_name,
      lastName: dotsUser.last_name,
      email: dotsUser.email,
      countryCode: dotsUser.phone_number.country_code,
      phoneNumber: dotsUser.phone_number.phone_number,
    },
  });

  return await prisma.programEnrollment.update({
    where: {
      id: programEnrollmentId,
    },
    data: { dotsUserId: newDotsUser.id },
  });
};
