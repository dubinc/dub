import { dub } from "@/lib/dub";
import { User } from "next-auth";
import { cookies } from "next/headers";

export const trackDubLead = async (user: User) => {
  const clickId = (await cookies()).get("dub_id")?.value;

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
  (await cookies()).delete("dub_id");
  (await cookies()).delete("dub_partner_data");
};
