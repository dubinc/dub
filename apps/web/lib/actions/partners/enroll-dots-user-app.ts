import { createDotsUser } from "@/lib/dots/create-dots-user";
import { retrieveDotsUser } from "@/lib/dots/retrieve-dots-user";
import { PartnerProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";

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

  if (!dotsUser || dotsUser.status === "unverified") {
    console.warn(
      `Partner ${partner.id} has a Dots user ID but the user is unverified`,
    );
    await log({
      message: `Tried to enroll partner ${partner.id} with Dots user ${partner.dotsUserId} in Dots app ${dotsAppId} but the user is unverified`,
      type: "errors",
    });
    return;
  }

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
