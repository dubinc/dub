import { mutateSuffix } from "@/lib/swr/mutate";
import {
  Button,
  InfoTooltip,
  SimpleTooltipContent,
  useCopyToClipboard,
  useMediaQuery,
} from "@dub/ui";
import { linkConstructor, TAB_ITEM_ANIMATION_SETTINGS } from "@dub/utils";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

interface Props {
  destinationDomain: string;
  shortLinkDomain: string;
  onCancel: () => void;
}

interface FormData {
  url: string;
  key: string;
}

export function ReferralsEmbedCreateUpdateLink({
  destinationDomain,
  shortLinkDomain,
  onCancel,
}: Props) {
  const { isMobile } = useMediaQuery();
  const [, copyToClipboard] = useCopyToClipboard();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { watch, register, handleSubmit } = useForm<FormData>();

  const [key, url] = watch("key", "url");

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/embed/referrals/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          url: linkConstructor({
            domain: destinationDomain,
            key: data.url,
          }),
        }),
      });

      const result = await response.json();

      // TODO:
      // Display success or error message

      if (!response.ok) {
        const { error } = result;
        return;
      }

      await mutateSuffix("/links");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveDisabled = useMemo(
    () => Boolean(isSubmitting || !key || !url),
    [isSubmitting, key, url],
  );

  return (
    <motion.div
      className="border-border-subtle relative rounded-md border"
      {...TAB_ITEM_ANIMATION_SETTINGS}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-h-[26rem] overflow-auto"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <span className="text-base font-semibold">New link</span>
          <div className="flex items-center gap-x-2">
            <Button
              text="Cancel"
              variant="secondary"
              type="button"
              className="h-9"
              onClick={onCancel}
            />
            <Button
              text="Create link"
              variant="primary"
              loading={isSubmitting}
              disabled={saveDisabled}
              className="h-9"
            />
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="url"
                className="block text-sm font-medium text-neutral-700"
              >
                Destination URL
              </label>
              <InfoTooltip
                content={
                  <SimpleTooltipContent
                    title="The URL your users will get redirected to when they visit your referral link."
                    cta="Learn more."
                    href="https://dub.co/help/article/how-to-create-link"
                  />
                }
              />
            </div>
            <div className="mt-2 flex rounded-md">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                {destinationDomain}
              </span>
              <input
                type="text"
                placeholder="about"
                className="block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                {...register("url", { required: false })}
                autoFocus={!isMobile}
                onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
                  e.preventDefault();

                  // if pasting in a URL, extract the pathname
                  const text = e.clipboardData.getData("text/plain");

                  try {
                    const url = new URL(text);
                    e.currentTarget.value = url.pathname.slice(1);
                  } catch (err) {
                    e.currentTarget.value = text;
                  }
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="short-link"
                  className="block text-sm font-medium"
                >
                  Short link
                </label>
                <InfoTooltip
                  content={
                    <SimpleTooltipContent
                      title="The URL that will be shared with your users. Keep it short and memorable!"
                      cta="Learn more."
                      href="https://dub.co/help/article/how-to-create-link"
                    />
                  }
                />
              </div>
            </div>
            <div className="mt-2 flex rounded-md">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                {shortLinkDomain}
              </span>
              <input
                type="text"
                placeholder="another-link"
                className="block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                {...register("key", { required: true })}
              />
            </div>
          </div>
        </div>
      </form>

      <div className="from-bg-default pointer-events-none absolute -bottom-px left-0 h-16 w-full rounded-b-lg bg-gradient-to-t sm:bottom-0" />
    </motion.div>
  );
}
