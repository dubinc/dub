import { EmailDomainStatus } from "@prisma/client";

export const EMAIL_DOMAIN_STATUS_TO_VARIANT: Record<EmailDomainStatus, string> =
  {
    verified: "success",
    failed: "error",
    pending: "pending",
    temporary_failure: "warning",
    not_started: "neutral",
    partially_verified: "pending",
    partially_failed: "warning",
  } as const;
