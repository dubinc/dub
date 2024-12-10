import { createDotsUser } from "@/lib/dots/create-dots-user";
import { retrieveDotsUser } from "@/lib/dots/retrieve-dots-user";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const partnerId = "pn_DlsZeePb38RVcnrfbD0SrKzB";
const dotsAppId = "7af68b86-abad-4b2d-a598-0becf6770fb7";

// REMEMBER TO CHANGE TO PROD ENVS FIRST OR THIS WONT WORK
async function main() {
  const partner = await prisma.partner.findUnique({
    where: {
      id: partnerId,
    },
  });

  if (!partner?.dotsUserId) {
    console.log("No Dots user ID found");
    return;
  }

  const dotsUser = await retrieveDotsUser(partner);

  const userInfo = {
    firstName: dotsUser.first_name,
    lastName: dotsUser.last_name,
    email: dotsUser.email,
    countryCode: dotsUser.phone_number.country_code,
    phoneNumber: dotsUser.phone_number.phone_number,
  };
  console.log(userInfo);

  const res = await createDotsUser({
    userInfo,
    dotsAppId,
  });

  console.log(res);
}

main();
