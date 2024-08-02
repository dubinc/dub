import { LinkProps } from "@/lib/types";
import { Eye, EyeOff, Random } from "@/ui/shared/icons";
import { ProBadgeTooltip } from "@/ui/shared/pro-badge-tooltip";
import { SimpleTooltipContent, Switch } from "@dub/ui";
import { ButtonTooltip } from "@dub/ui/src/tooltip";
import { FADE_IN_ANIMATION_SETTINGS, nanoid } from "@dub/utils";
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
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-gray-900">
            Password Protection
          </h2>
          <ProBadgeTooltip
            content={
              <SimpleTooltipContent
                title="Restrict access to your short links by encrypting it with a password."
                cta="Learn more."
                href="https://dub.co/help/article/password-protected-links"
              />
            }
          />
        </div>
        <div className="flex items-center gap-2">
          {enabled && (
            <ButtonTooltip
              tooltipContent="Generate a random password"
              onClick={() => {
                setData({ ...data, password: nanoid(24) });
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors duration-75 hover:bg-gray-100 active:bg-gray-200 disabled:cursor-not-allowed"
            >
              <Random className="h-3 w-3" />
            </ButtonTooltip>
          )}
          <Switch fn={() => setEnabled(!enabled)} checked={enabled} />
        </div>
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
            className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
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
