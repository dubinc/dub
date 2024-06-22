import { LinkProps } from "@/lib/types";
import { ProBadgeTooltip } from "@/ui/shared/pro-badge-tooltip";
import { SimpleTooltipContent, Switch } from "@dub/ui";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

export default function DoIndexSection({
  data,
  setData,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const { doIndex } = data;
  const [enabled, setEnabled] = useState(doIndex);
  useEffect(() => {
    if (enabled) {
      // if enabling, set doIndex to true
      setData({
        ...data,
        doIndex: true,
      });
    } else {
      // if disabling, set doIndex to false
      setData({ ...data, doIndex: false });
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
                title="Allow search engines to index your short link. Disabled by default."
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
