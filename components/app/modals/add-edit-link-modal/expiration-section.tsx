import { Dispatch, SetStateAction } from "react";
import { X, QuestionCircle } from "@/components/shared/icons";
import { LinkProps } from "@/lib/types";
import { getDateTimeLocal } from "@/lib/utils";
import Tooltip from "@/components/shared/tooltip";

export default function ExpirationSection({
  data,
  setData,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const { expiresAt } = data;
  return (
    <div>
      <div className="flex items-center">
        <label
          htmlFor="expiresAt"
          className="text-sm font-medium text-gray-900"
        >
          Expiration Date
        </label>
        <Tooltip
          content="Automatically expires your link at a given date and time. Your link
          will be disabled but the data will still be kept."
        >
          <div className="flex h-4 w-8 justify-center">
            <QuestionCircle className="h-4 w-4 text-gray-600" />
          </div>
        </Tooltip>
      </div>
      <div className="mt-1 flex space-x-2">
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
          className="flex w-full items-center justify-center space-x-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-500 shadow-sm transition-all hover:border-gray-800 focus:border-gray-800 focus:outline-none focus:ring-gray-500"
        />
        <button
          onClick={() => setData({ ...data, expiresAt: null })}
          type="button"
          className="group flex h-10 w-10 items-center justify-center rounded-md border text-gray-500 transition-all hover:border-gray-800 hover:text-gray-800 focus:outline-none"
        >
          <X className="h-4 w-4 text-gray-400 transition-all group-hover:text-black" />
        </button>
      </div>
    </div>
  );
}
