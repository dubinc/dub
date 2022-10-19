import { Dispatch, SetStateAction, useCallback, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import BlurImage from "@/components/shared/blur-image";
import {
  ChevronRight,
  LoadingCircle,
  UploadCloud,
} from "@/components/shared/icons";
import { LinkProps } from "@/lib/types";
import { getDateTimeLocal } from "@/lib/utils";
import OGSection from "./og-section";

export default function AdvancedSettings({
  data,
  setData,
}: {
  data: LinkProps;
  setData: Dispatch<SetStateAction<LinkProps>>;
}) {
  const [expanded, setExpanded] = useState(false);

  const { password, expiresAt } = data;

  return (
    <div>
      <div className="sm:px-16 px-4">
        <button
          type="button"
          className="flex items-center"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronRight
            className={`h-5 w-5 text-gray-600 ${
              expanded ? "rotate-90" : ""
            } transition-all`}
          />
          <p className="text-gray-600 text-sm">Advanced options</p>
        </button>
      </div>

      {expanded && (
        <div className="mt-4 grid gap-5 bg-white border-t border-b border-gray-200 sm:px-16 px-4 py-8">
          {/* OG Tags Section */}
          <OGSection {...{ data, setData }} />

          {/* Password Protection */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password Protection
            </label>
            <div className="flex mt-1 rounded-md shadow-sm">
              <input
                name="password"
                id="password"
                type="password"
                className="border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500 block w-full rounded-md focus:outline-none sm:text-sm"
                value={password}
                onChange={(e) => {
                  setData({ ...data, password: e.target.value });
                }}
                aria-invalid="true"
              />
            </div>
          </div>

          {/* Expire Link */}
          <div>
            <label
              htmlFor="expiresAt"
              className="flex justify-between text-sm font-medium text-gray-700"
            >
              <p>Auto-expire Link</p>
              {expiresAt &&
                new Date().getTime() > new Date(expiresAt).getTime() && (
                  <span className="bg-amber-500 px-2 py-0.5 text-xs text-white uppercase">
                    Expired
                  </span>
                )}
            </label>
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
              className="flex space-x-2 justify-center items-center mt-1 rounded-md shadow-sm border border-gray-300 text-gray-500 hover:border-gray-800 px-3 py-2 w-full focus:outline-none sm:text-sm transition-all"
            />
          </div>
        </div>
      )}
    </div>
  );
}
