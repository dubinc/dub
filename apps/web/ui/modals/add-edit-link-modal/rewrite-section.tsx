import useProject from "@/lib/swr/use-project";
import {
  InfoTooltip,
  SimpleTooltipContent,
  Switch,
  TooltipContent,
  useRouterStuff,
} from "@dub/ui";
import { HOME_DOMAIN } from "@dub/utils";
import { type Link as LinkProps } from "@prisma/client";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

export default function RewriteSection({
  data,
  setData,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const { plan } = useProject();
  const { queryParams } = useRouterStuff();

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
    <div className="relative border-b border-gray-200 pb-5">
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
          // link cloaking is only available on Dub's Pro plan
          {...((!plan || plan === "free") && !enabled
            ? {
                disabledTooltip: (
                  <TooltipContent
                    title={`Link cloaking is only available on ${process.env.NEXT_PUBLIC_APP_NAME}'s Pro plan. Upgrade to Pro to use this feature.`}
                    cta="Upgrade to Pro"
                    {...(plan === "free"
                      ? {
                          onClick: () =>
                            queryParams({
                              set: {
                                upgrade: "pro",
                              },
                            }),
                        }
                      : {
                          href: `${HOME_DOMAIN}/pricing`,
                        })}
                  />
                ),
              }
            : {})}
        />
      </div>
    </div>
  );
}
