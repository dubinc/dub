import { Tooltip } from "@dub/ui";

export const PartnerEmailNotificationTooltipHelper = ({
  text = "notified via email",
}: {
  text?: string;
}) => {
  return (
    <Tooltip content="Only partners who have previously created an account on [partners.dub.co](https://partners.dub.co) will receive an email notification.">
      <span className="cursor-help underline decoration-dotted underline-offset-2">
        {text}
      </span>
    </Tooltip>
  );
};
