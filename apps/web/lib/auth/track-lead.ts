import { dub } from "@/lib/dub";
import { User } from "next-auth";
import { cookies } from "next/headers";

export const trackLead = async (user: User) => {
  const clickId = cookies().get("dub_id")?.value;

  if (!clickId) {
    console.log("No dub_id cookie found, skipping lead tracking...");
    return;
  }

  // send the lead event to Dub
  await dub.track.lead({
    clickId,
    eventName: "Sign Up",
    customerExternalId: user.id,
    customerName: user.name,
    customerEmail: user.email,
    customerAvatar: user.image,
  });

  // delete the cookies
  cookies().delete("dub_id");
  cookies().delete("dub_partner_data");
};
