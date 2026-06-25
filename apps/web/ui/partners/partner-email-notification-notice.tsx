import { nFormatter, pluralize } from "@dub/utils";
import { cn } from "@dub/utils/src";

export function getPartnerEmailNotificationMessage({
  partnerCount = 1,
  message,
}: {
  partnerCount?: number;
  message?: string;
} = {}) {
  if (message) {
    return message;
  }

  return partnerCount === 1
    ? "This partner will be notified by email."
    : `${nFormatter(partnerCount, { full: true })} ${pluralize("partner", partnerCount)} will be notified by email.`;
}

interface PartnerEmailNotificationNoticeProps {
  partnerCount?: number;
  message?: string;
  className?: string;
}

export function PartnerEmailNotificationNotice({
  partnerCount = 1,
  message,
  className,
}: PartnerEmailNotificationNoticeProps) {
  return (
    <p className={cn("text-xs text-neutral-500", className)}>
      {getPartnerEmailNotificationMessage({ partnerCount, message })}
    </p>
  );
}
