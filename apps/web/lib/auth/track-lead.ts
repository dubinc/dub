import { User } from "next-auth";
import { cookies } from "next/headers";

export const trackLead = async (user: User) => {
  const clickId =
    cookies().get("dub_id")?.value || cookies().get("dclid")?.value;

  if (!clickId) {
    console.log("No clickId cookie found, skipping lead tracking...");
    return;
  }

  // dub.track.lead({
  //   clickId,
  //   eventName: "Sign Up",
  //   customerId: user.id,
  //   customerName: user.name,
  //   customerEmail: user.email,
  //   customerAvatar: user.image,
  // }),
  await fetch("https://api.dub.co/track/lead", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DUB_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clickId,
      eventName: "Sign Up",
      customerId: user.id,
      customerName: user.name,
      customerEmail: user.email,
      customerAvatar: user.image,
    }),
  }).then((res) => res.json());

  // delete the clickId cookie
  cookies().delete("dclid");
  cookies().delete("dub_id");
};
