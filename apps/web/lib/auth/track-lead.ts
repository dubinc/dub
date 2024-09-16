import { dub } from "@/lib/dub";
import { User } from "next-auth";
import { cookies } from "next/headers";

export const trackLead = async (user: User) => {
  const clickId =
    cookies().get("dub_id")?.value || cookies().get("dclid")?.value;

  if (!clickId) {
    console.log("No clickId cookie found, skipping lead tracking...");
    return;
  }

  // send the lead event to Dub
  await dub.track.lead({
    clickId,
    eventName: "Sign Up",
    customerId: user.id,
    customerName: user.name,
    customerEmail: user.email,
    customerAvatar: user.image,
  });

  // delete the clickId cookie
  cookies().delete("dclid");
  cookies().delete("dub_id");
};
