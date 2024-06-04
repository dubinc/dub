import { withAdmin } from "@/lib/auth";
import { sendEmail } from "emails";
import UpgradeEmail from "emails/upgrade-email";
import { NextResponse } from "next/server";

// POST /api/admin/send-thanks
export const POST = withAdmin(async ({ req }) => {
  const { email } = await req.json();

  await sendEmail({
    email,
    subject: "Thank you for upgrading to Dub.co Pro!",
    react: UpgradeEmail({
      name: null,
      email,
      plan: "pro",
    }),
    marketing: true,
    bcc: process.env.TRUSTPILOT_BCC_EMAIL,
  });

  return NextResponse.json({ success: true });
});
