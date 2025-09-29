const NOTIFICATION_EMAIL_SUBJECT_KEYWORDS = ["bounty", "message"];

export async function emailBounced({
  email_id: emailId,
  subject,
  tags,
}: {
  email_id: string;
  subject?: string;
  tags?: Record<string, string>;
}) {
  //
}
