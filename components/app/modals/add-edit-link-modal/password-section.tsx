import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { LinkProps } from "@/lib/types";
import Switch from "@/components/shared/switch";
import { motion } from "framer-motion";
import { FADE_IN_ANIMATION_SETTINGS } from "@/lib/constants";
import { Eye, EyeOff } from "@/components/shared/icons";

export default function PasswordSection({
  props,
  data,
  setData,
}: {
  props: LinkProps;
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
    <div className="border-b border-gray-200 pb-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900">
          Password Protection
        </h2>
        <Switch fn={() => setEnabled(!enabled)} checked={enabled} />
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
            className="block w-full rounded-md border-gray-300 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
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
