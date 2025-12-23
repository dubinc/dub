import { StatusBadge, Tooltip } from "@dub/ui";

export const DisabledLinkTooltip = () => {
  return (
    <Tooltip content="This link is disabled. It will redirect to its [domain's not found URL](https://dub.co/help/article/setting-not-found-url), and its stats will be excluded from [your overall stats](https://dub.co/help/article/dub-analytics).">
      <StatusBadge variant="neutral" size="sm" icon={null}>
        Disabled
      </StatusBadge>
    </Tooltip>
  );
};
