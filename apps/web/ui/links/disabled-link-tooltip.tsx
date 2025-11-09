import { StatusBadge, Tooltip } from "@dub/ui";

export const DisabledLinkTooltip = () => {
  return (
    <Tooltip
      content={
        <div className="max-w-xs px-4 py-2 text-center text-sm text-neutral-700">
          This link is disabled. It will redirect to its{" "}
          <a
            href="https://dub.co/help/article/setting-not-found-url"
            target="_blank"
            className="cursor-alias underline decoration-dotted underline-offset-2"
          >
            domain's not found URL
          </a>
          , and its stats will be excluded from{" "}
          <a
            href="https://dub.co/help/article/dub-analytics"
            target="_blank"
            className="cursor-alias underline decoration-dotted underline-offset-2"
          >
            your overall stats
          </a>
          .
        </div>
      }
    >
      <StatusBadge variant="neutral" size="sm" icon={null}>
        Disabled
      </StatusBadge>
    </Tooltip>
  );
};
