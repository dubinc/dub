import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps } from "@/lib/types";
import {
  InfoTooltip,
  SimpleTooltipContent,
  Switch,
  useRouterStuff,
} from "@dub/ui";
import { TooltipContent } from "@dub/ui/src/tooltip";
import {
  FADE_IN_ANIMATION_SETTINGS,
  HOME_DOMAIN,
  getDateTimeLocal,
} from "@dub/utils";
import { motion } from "framer-motion";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

export default function ExpirationSection({
  props,
  data,
  setData,
}: {
  props?: LinkProps;
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const { plan } = useWorkspace();
  const { queryParams } = useRouterStuff();

  const { expiresAt } = data;
  const [enabled, setEnabled] = useState(!!expiresAt);
  useEffect(() => {
    if (enabled) {
      // if enabling, add previous expiration date if exists
      setData({
        ...data,
        expiresAt: props?.expiresAt || expiresAt,
      });
    } else {
      // if disabling, remove expiration date
      setData({ ...data, expiresAt: null });
    }
  }, [enabled]);

  return (
    <div className="relative border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between space-x-2">
          <h2 className="text-sm font-medium text-gray-900">Expiration Date</h2>
          <InfoTooltip
            content={
              <SimpleTooltipContent
                title="Set an expiration date for your links – after which it won't be accessible."
                cta="Learn more."
                href={`${HOME_DOMAIN}/help/article/link-expiration`}
              />
            }
          />
        </div>
        <Switch
          fn={() => setEnabled(!enabled)}
          checked={enabled}
          // expiration date is only available on Dub's Pro plan
          {...((!plan || plan === "free") && !enabled
            ? {
                disabledTooltip: (
                  <TooltipContent
                    title={`Expiration date is only available on ${process.env.NEXT_PUBLIC_APP_NAME}'s Pro plan. Upgrade to Pro to use this feature.`}
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
      {enabled && (
        <motion.div className="mt-3" {...FADE_IN_ANIMATION_SETTINGS}>
          <input
            type="datetime-local"
            id="expiresAt"
            name="expiresAt"
            min={getDateTimeLocal()}
            value={expiresAt ? getDateTimeLocal(expiresAt) : ""}
            step="60" // need to add step to prevent weird date bug (https://stackoverflow.com/q/19284193/10639526)
            onChange={(e) => {
              setData({ ...data, expiresAt: new Date(e.target.value) });
            }}
            className="flex w-full items-center justify-center space-x-2 rounded-md border border-gray-300 px-3 py-2 text-gray-500 shadow-sm transition-all hover:border-gray-800 focus:border-gray-800 focus:outline-none focus:ring-gray-500 sm:text-sm"
          />
        </motion.div>
      )}
    </div>
  );
}
