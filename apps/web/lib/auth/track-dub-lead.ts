import { dub } from "@/lib/dub";
import { cookies } from "next/headers";
import { SessionUser } from "../better-auth/get-session";

export const trackDubLead = async (
  user: Pick<SessionUser, "id" | "name" | "email" | "image">,
) => {
  const cookieStore = await cookies();
  const clickId = cookieStore.get("dub_id")?.value;

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
  cookieStore.delete("dub_id");
  cookieStore.delete("dub_partner_data");
};
