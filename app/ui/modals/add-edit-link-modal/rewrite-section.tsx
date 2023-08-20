import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { type Link as LinkProps } from "@prisma/client";
import Switch from "#/ui/switch";
import { HOME_DOMAIN } from "#/lib/constants";
import { InfoTooltip, SimpleTooltipContent } from "#/ui/tooltip";
import { useParams } from "next/navigation";

export default function RewriteSection({
  data,
  setData,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const { slug } = useParams() as { slug: string };

  const { rewrite } = data;
  const [enabled, setEnabled] = useState(rewrite);
  useEffect(() => {
    if (enabled) {
      // if enabling, set rewrite to true or props.rewrite
      setData({
        ...data,
        rewrite: true,
      });
    } else {
      // if disabling, set rewrite to false
      setData({ ...data, rewrite: false });
    }
  }, [enabled]);

  return (
    <div className="border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between space-x-2">
          <h2 className="text-sm font-medium text-gray-900">Link Cloaking</h2>
          <InfoTooltip
            content={
              <SimpleTooltipContent
                title="Mask your destination URL so your users only see the short link in the browser address bar."
                cta="Learn more."
                href={`${HOME_DOMAIN}/help/article/how-to-create-link#link-cloaking`}
              />
            }
          />
        </div>
        <Switch
          fn={() => setEnabled(!enabled)}
          checked={enabled}
          // link cloaking is only available on custom domains
          {...(slug
            ? {}
            : {
                disabledTooltip: (
                  <SimpleTooltipContent
                    title="You can only use link cloaking on a project with a custom domain."
                    cta="Learn more."
                    href={`${HOME_DOMAIN}/help/article/how-to-create-link#dubsh-links-vs-custom-domain-links`}
                  />
                ),
              })}
        />
      </div>
    </div>
  );
}
