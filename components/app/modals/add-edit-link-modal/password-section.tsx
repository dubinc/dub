import { Dispatch, SetStateAction } from "react";
import { LinkProps } from "@/lib/types";
import Tooltip from "@/components/shared/tooltip";
import { QuestionCircle } from "@/components/shared/icons";

export default function PasswordSection({
  data,
  setData,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const { password } = data;
  return (
    <div>
      <div className="flex items-center">
        <label htmlFor="password" className="text-sm font-medium text-gray-900">
          Password Protection
        </label>
        <Tooltip
          content="Protect your links with a password. Users will need to enter the
          password to access the link."
        >
          <div className="flex h-4 w-8 justify-center">
            <QuestionCircle className="h-4 w-4 text-gray-600" />
          </div>
        </Tooltip>
      </div>
      <div className="mt-1 flex rounded-md shadow-sm">
        <input
          name="password"
          id="password"
          type="password"
          className="block w-full rounded-md border-gray-300 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
          value={password || ""}
          onChange={(e) => {
            setData({ ...data, password: e.target.value });
          }}
          aria-invalid="true"
        />
      </div>
    </div>
  );
}
