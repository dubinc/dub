import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps } from "@/lib/types";
import {
  InfoTooltip,
  SimpleTooltipContent,
  Switch,
  TooltipContent,
  useRouterStuff,
} from "@dub/ui";
import { FADE_IN_ANIMATION_SETTINGS, HOME_DOMAIN } from "@dub/utils";
import { motion } from "framer-motion";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

export default function AndroidSection({
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
  const { android } = data;
  const [enabled, setEnabled] = useState(!!android);
  useEffect(() => {
    if (enabled) {
      // if enabling, add previous android link if exists
      setData({
        ...data,
        android: props?.android || android,
      });
    } else {
      // if disabling, remove android link
      setData({ ...data, android: null });
    }
  }, [enabled]);

  return (
    <div className="relative border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between space-x-2">
          <h2 className="text-sm font-medium text-gray-900">
            Android Targeting
          </h2>
          <InfoTooltip
            content={
              <SimpleTooltipContent
                title="Redirect your Android users to a different link."
                cta="Learn more about device targeting."
                href={`${HOME_DOMAIN}/help/article/device-targeting`}
              />
            }
          />
        </div>
        <Switch
          fn={() => setEnabled(!enabled)}
          checked={enabled}
          // Android targeting is only available on Dub's Pro plan
          {...((!plan || plan === "free") && !enabled
            ? {
                disabledTooltip: (
                  <TooltipContent
                    title={`Android targeting is only available on ${process.env.NEXT_PUBLIC_APP_NAME}'s Pro plan. Upgrade to Pro to use this feature.`}
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
        <motion.div
          className="mt-3 flex rounded-md shadow-sm"
          {...FADE_IN_ANIMATION_SETTINGS}
        >
          <input
            name="android-url"
            id="android-url"
            type="url"
            placeholder="https://play.google.com/store/apps/details?id=com.disney.disneyplus"
            value={android || ""}
            onChange={(e) => {
              setData({ ...data, android: e.target.value });
            }}
            className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
            aria-invalid="true"
          />
        </motion.div>
      )}
    </div>
  );
}
