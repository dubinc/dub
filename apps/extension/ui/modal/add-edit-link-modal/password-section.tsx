import { FADE_IN_ANIMATION_SETTINGS } from "@dub/utils";
import { motion } from "framer-motion";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { LinkProps } from "src/types";
import { SimpleTooltipContent, Switch } from "../../";
import Input from "../../../ui/input";
import { ProBadgeTooltip } from "../../shared/pro-badge-tooltip";

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
        <div className="flex items-center justify-between space-x-2">
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
        <Switch fn={() => setEnabled(!enabled)} checked={enabled} />
      </div>
      {enabled && (
        <motion.div
          className="relative mt-3 rounded-md shadow-sm"
          {...FADE_IN_ANIMATION_SETTINGS}
        >
          <Input
            name="password"
            id="password"
            type={showPassword ? "text" : "password"}
            className="block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-none focus:border-gray-500 focus:shadow-lg focus:outline-none focus:ring-gray-500 sm:text-sm"
            value={password || ""}
            placeholder="Enter password"
            onChange={(e) => {
              setData({ ...data, password: e.target.value });
            }}
            aria-invalid="true"
          />
          <div
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3"
          >
            {showPassword ? (
              <EyeIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
            ) : (
              <EyeOffIcon
                className="h-4 w-4 text-gray-400"
                aria-hidden="true"
              />
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
