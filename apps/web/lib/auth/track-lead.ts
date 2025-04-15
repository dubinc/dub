import { dub } from "@/lib/dub";
import { User } from "next-auth";
import { cookies } from "next/headers";

export const trackLead = async (user: User) => {
  const dubId = cookies().get("dub_id")?.value;

  if (!dubId) {
    console.log("No dub_id cookie found, skipping lead tracking...");
    return;
  }

  // send the lead event to Dub
  await dub.track.lead({
    clickId: dubId,
    eventName: "Sign Up",
    externalId: user.id,
    customerName: user.name,
    customerEmail: user.email,
    customerAvatar: user.image,
  });

  // delete the cookies
  cookies().delete("dub_id");
  cookies().delete("dub_partner_data");
};
