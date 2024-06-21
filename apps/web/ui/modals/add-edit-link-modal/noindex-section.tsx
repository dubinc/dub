import { LinkProps } from "@/lib/types";
import { ProBadgeTooltip } from "@/ui/shared/pro-badge-tooltip";
import { SimpleTooltipContent, Switch } from "@dub/ui";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

export default function NoindexSection({
  data,
  setData,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const { noindex } = data;
  const [enabled, setEnabled] = useState(!noindex);
  useEffect(() => {
    if (enabled) {
      // if enabling, set noindex to true
      setData({
        ...data,
        noindex: false,
      });
    } else {
      // if disabling, set noindex to false
      setData({ ...data, noindex: true });
    }
  }, [enabled]);

  return (
    <div className="relative border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between space-x-2">
          <h2 className="text-sm font-medium text-gray-900">
            Search Engine Indexing
          </h2>
          <ProBadgeTooltip
            content={
              <SimpleTooltipContent
                title="Prevent search engines from indexing your short link."
                cta="Learn more."
                href="https://dub.co/help/article/how-noindex-works"
              />
            }
          />
        </div>
        <Switch fn={() => setEnabled(!enabled)} checked={enabled} />
      </div>
    </div>
  );
}
