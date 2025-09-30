export const RESEND_AUDIENCES = {
  "app.dub.co": "f5ff0661-4234-43f6-b0ca-a3f3682934e3",
  "partners.dub.co": "6caf6898-941a-45b6-a59f-d0780c3004ac",
};

const primary = process.env.RESEND_EMAIL_FROM_PRIMARY || "Dub.co <system@dub.co>";
const notifications = process.env.RESEND_EMAIL_FROM_NOTIFICATIONS || "Dub.co <notifications@mail.dub.co>";
const marketing = process.env.RESEND_EMAIL_FROM_MARKETING || "Steven from Dub.co <steven@ship.dub.co>";

export const VARIANT_TO_FROM_MAP = {
  primary,
  notifications,
  marketing,
};

export const RESEND_REPLY_TO = process.env.RESEND_EMAIL_REPLY_TO || "support@dub.co";