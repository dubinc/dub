"use client";

import { LinkFormData } from "@/ui/links/link-builder/link-builder-provider";
import { Tooltip } from "@dub/ui";
import {
  getYouTubeTimestampFromUrl,
  isYouTubeUrl,
  setYouTubeTimestampInUrl,
} from "@dub/utils";
import { useCallback, useEffect, useId, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

export function VideoTimestampInput() {
  const id = useId();
  const { setValue } = useFormContext<LinkFormData>();
  const url = useWatch({ name: "url" }) as string | undefined;

  const isYouTube = Boolean(url && isYouTubeUrl(url));
  const initialSeconds =
    url && isYouTube ? getYouTubeTimestampFromUrl(url) : null;

  const [minutes, setMinutes] = useState<number>(
    initialSeconds != null ? Math.floor(initialSeconds / 60) : 0,
  );
  const [seconds, setSeconds] = useState<number>(
    initialSeconds != null ? initialSeconds % 60 : 0,
  );

  const totalSeconds = minutes * 60 + seconds;
  const hasTimestamp = totalSeconds > 0;

  useEffect(() => {
    if (!isYouTube || !url) return;
    const t = getYouTubeTimestampFromUrl(url);
    if (t != null) {
      setMinutes(Math.floor(t / 60));
      setSeconds(t % 60);
    } else {
      setMinutes(0);
      setSeconds(0);
    }
  }, [url, isYouTube]);

  const applyTimestamp = useCallback(
    (newMinutes: number, newSeconds: number) => {
      if (!url || !isYouTubeUrl(url)) return;
      const total = newMinutes * 60 + newSeconds;
      const newUrl =
        total <= 0
          ? setYouTubeTimestampInUrl(url, null)
          : setYouTubeTimestampInUrl(url, total);
      setValue("url", newUrl, { shouldDirty: true });
    },
    [url, setValue],
  );

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(0, parseInt(e.target.value, 10) || 0);
    setMinutes(v);
    applyTimestamp(v, seconds);
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0));
    setSeconds(v);
    applyTimestamp(minutes, v);
  };

  const handleClear = () => {
    setMinutes(0);
    setSeconds(0);
    if (url && isYouTubeUrl(url)) {
      setValue("url", setYouTubeTimestampInUrl(url, null), {
        shouldDirty: true,
      });
    }
  };

  if (!isYouTube) return null;

  return (
    <div className="grid gap-y-1">
      <div className="flex items-center gap-2">
        <Tooltip
          content={
            <div className="p-3 text-center text-xs">
              <p className="text-neutral-600">
                Start the video at this time. Stored as <code>?t=</code>{" "}
                (seconds) so the link jumps to this point.
              </p>
            </div>
          }
          sideOffset={4}
          disableHoverableContent
        >
          <label
            htmlFor={`${id}-video-ts`}
            className="cursor-default text-sm font-medium text-neutral-700"
          >
            Video timestamp
          </label>
        </Tooltip>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-neutral-300 bg-white focus-within:ring-2 focus-within:ring-neutral-500 focus-within:ring-offset-0">
          <input
            id={`${id}-video-ts`}
            type="number"
            min={0}
            max={599}
            placeholder="0"
            className="w-14 border-0 bg-transparent py-2 pl-3 pr-1 text-sm tabular-nums focus:ring-0"
            value={minutes === 0 ? "" : minutes}
            onChange={handleMinutesChange}
            aria-label="Minutes"
          />
          <span className="text-neutral-400">m</span>
          <input
            type="number"
            min={0}
            max={59}
            placeholder="0"
            className="w-12 border-0 border-l border-neutral-200 bg-transparent py-2 pl-2 pr-2 text-sm tabular-nums focus:ring-0"
            value={seconds === 0 ? "" : seconds}
            onChange={handleSecondsChange}
            aria-label="Seconds"
          />
          <span className="pr-3 text-neutral-400">s</span>
        </div>
        {hasTimestamp && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-neutral-500 underline hover:text-neutral-700"
          >
            Clear
          </button>
        )}
      </div>
      {hasTimestamp && (
        <p className="text-xs text-neutral-500">
          Link will open at {minutes > 0 ? `${minutes}m ` : ""}
          {seconds}s (
          <code className="rounded bg-neutral-100 px-0.5">?t={totalSeconds}</code>
          )
        </p>
      )}
    </div>
  );
}
