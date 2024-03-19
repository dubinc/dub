import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps } from "@/lib/types";
import { Eye, EyeOff } from "@/ui/shared/icons";
import {
  InfoTooltip,
  SimpleTooltipContent,
  Switch,
  useRouterStuff,
} from "@dub/ui";
import { TooltipContent } from "@dub/ui/src/tooltip";
import { FADE_IN_ANIMATION_SETTINGS, HOME_DOMAIN } from "@dub/utils";
import { motion } from "framer-motion";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

export default function PasswordSection({
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

  const { password } = data;
  const [enabled, setEnabled] = useState(!!password);
  useEffect(() => {
    if (enabled) {
      // if enabling, add previous password if exists
      setData({
        ...data,
        password: props?.password || password,
      });
    } else {
      // if disabling, remove password
      setData({ ...data, password: null });
    }
  }, [enabled]);

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between space-x-2">
          <h2 className="text-sm font-medium text-gray-900">
            Password Protection
          </h2>
          <InfoTooltip
            content={
              <SimpleTooltipContent
                title="Restrict access to your short links by encrypting it with a password."
                cta="Learn more."
                href={`${HOME_DOMAIN}/help/article/password-protected-links`}
              />
            }
          />
        </div>
        <Switch
          fn={() => setEnabled(!enabled)}
          checked={enabled}
          // password protection is only available on Dub's Pro plan
          {...((!plan || plan === "free") && !enabled
            ? {
                disabledTooltip: (
                  <TooltipContent
                    title={`Password protection is only available on ${process.env.NEXT_PUBLIC_APP_NAME}'s Pro plan. Upgrade to Pro to use this feature.`}
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
          className="relative mt-3 rounded-md shadow-sm"
          {...FADE_IN_ANIMATION_SETTINGS}
        >
          <input
            name="password"
            id="password"
            type={showPassword ? "text" : "password"}
            className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
            value={password || ""}
            placeholder="Enter password"
            onChange={(e) => {
              setData({ ...data, password: e.target.value });
            }}
            aria-invalid="true"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
          >
            {showPassword ? (
              <Eye className="h-4 w-4 text-gray-400" aria-hidden="true" />
            ) : (
              <EyeOff className="h-4 w-4 text-gray-400" aria-hidden="true" />
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
}
