import { mutateSuffix } from "@/lib/swr/mutate";
import { Lock } from "@/ui/shared/icons";
import {
  Button,
  InfoTooltip,
  SimpleTooltipContent,
  useCopyToClipboard,
  useMediaQuery,
} from "@dub/ui";
import { cn, linkConstructor, TAB_ITEM_ANIMATION_SETTINGS } from "@dub/utils";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useEmbedToken } from "../use-embed-token";
import { ReferralsEmbedLink } from "./types";

interface Props {
  destinationDomain: string;
  shortLinkDomain: string;
  link?: ReferralsEmbedLink | null;
  onCancel: () => void;
}

interface FormData {
  url: string;
  key: string;
}

export function ReferralsEmbedCreateUpdateLink({
  destinationDomain,
  shortLinkDomain,
  link,
  onCancel,
}: Props) {
  const token = useEmbedToken();
  const { isMobile } = useMediaQuery();
  const [, copyToClipboard] = useCopyToClipboard();
  const [lockKey, setLockKey] = useState(Boolean(link));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    watch,
    setValue,
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<FormData>({
    defaultValues: link
      ? {
          url: link.url
            .replace(`https://${destinationDomain}`, "")
            .replace(/^\/+/, ""),
          key: link.key,
        }
      : undefined,
  });

  const key = watch("key");

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const endpoint = !link
        ? "/api/embed/referrals/links"
        : `/api/embed/referrals/links/${link.id}`;

      const response = await fetch(endpoint, {
        method: !link ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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

      if (!response.ok) {
        setErrorMessage(result.error.message);
        return;
      }

      if (!link) {
        copyToClipboard(result.shortLink);
      }

      await mutateSuffix("api/embed/referrals/links");
      onCancel();
    } catch (error) {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveDisabled = useMemo(
    () => Boolean(isSubmitting || (!link ? !key : !isDirty)),
    [isSubmitting, key, isDirty, link],
  );

  return (
    <motion.div
      className="border-border-subtle bg-bg-default relative rounded-md border"
      {...TAB_ITEM_ANIMATION_SETTINGS}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-h-[26rem] overflow-auto"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <span className="text-content-default text-base font-semibold">
            {!link ? "New link" : "Edit link"}
          </span>
          <div className="flex items-center gap-x-2">
            <Button
              text="Cancel"
              variant="secondary"
              type="button"
              className="h-8 px-3"
              onClick={onCancel}
            />
            <Button
              text={!link ? "Create link" : "Update link"}
              variant="primary"
              loading={isSubmitting}
              disabled={saveDisabled}
              className="h-8 px-3"
            />
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="short-link"
                  className="text-content-default block text-sm font-medium"
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

              {lockKey && (
                <button
                  className="flex h-5 items-center space-x-2 text-sm text-neutral-500 transition-all duration-75 hover:text-black active:scale-95 dark:text-neutral-400 dark:hover:text-white"
                  type="button"
                  onClick={() => {
                    window.confirm(
                      "Updating your short link key could potentially break existing links. Are you sure you want to continue?",
                    ) && setLockKey(false);
                  }}
                >
                  <Lock className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="mt-2 flex rounded-md">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                {shortLinkDomain}
              </span>
              <input
                type="text"
                placeholder="another-link"
                autoFocus={!isMobile}
                className={cn(
                  "border-border-default text-content-default bg-bg-default block w-full rounded-r-md placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm dark:placeholder-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-400",
                  {
                    "cursor-not-allowed bg-neutral-50 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400":
                      lockKey,
                  },
                )}
                {...register("key", { required: true })}
                disabled={lockKey}
              />
            </div>

            {errorMessage && (
              <div className="mt-2 flex justify-end">
                <span className="text-sm text-red-600 dark:text-red-400">
                  {errorMessage}
                </span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="url"
                className="text-content-default block text-sm font-medium"
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
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                {destinationDomain}
              </span>
              <input
                type="text"
                placeholder="about"
                className="border-border-default text-content-default bg-bg-default block w-full rounded-r-md placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm dark:placeholder-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-400"
                {...register("url", { required: false })}
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

                  setValue("url", e.currentTarget.value, {
                    shouldDirty: true,
                  });
                }}
              />
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
