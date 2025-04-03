import { mutateSuffix } from "@/lib/swr/mutate";
import { Lock } from "@/ui/shared/icons";
import { Link } from "@dub/prisma/client";
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

interface Props {
  destinationDomain: string;
  shortLinkDomain: string;
  link?: Link | null;
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
  const { isMobile } = useMediaQuery();
  const [, copyToClipboard] = useCopyToClipboard();
  const [lockKey, setLockKey] = useState(Boolean(link));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    watch,
    setValue,
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<FormData>({
    defaultValues: link
      ? {
          url: link.url.replace(`https://${destinationDomain}/`, ""),
          key: link.key,
        }
      : undefined,
  });

  const key = watch("key");

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      const endpoint = !link
        ? "/api/embed/referrals/links"
        : `/api/embed/referrals/links/${link.id}`;

      const response = await fetch(endpoint, {
        method: !link ? "POST" : "PATCH",
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

      if (!response.ok) {
        const { error } = result;
        return;
      }

      await mutateSuffix("/links");
      onCancel();
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
      className="border-border-subtle relative rounded-md border"
      {...TAB_ITEM_ANIMATION_SETTINGS}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-h-[26rem] overflow-auto"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <span className="text-base font-semibold">
            {!link ? "New link" : "Edit link"}
          </span>
          <div className="flex items-center gap-x-2">
            <Button
              text="Cancel"
              variant="secondary"
              type="button"
              className="h-9"
              onClick={onCancel}
            />
            <Button
              text={!link ? "Create link" : "Update link"}
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

                  setValue("url", e.currentTarget.value, {
                    shouldDirty: true,
                  });
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

              {lockKey && (
                <button
                  className="flex h-5 items-center space-x-2 text-sm text-neutral-500 transition-all duration-75 hover:text-black active:scale-95"
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
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                {shortLinkDomain}
              </span>
              <input
                type="text"
                placeholder="another-link"
                className={cn(
                  "block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  {
                    "cursor-not-allowed border border-neutral-300 bg-neutral-100 text-neutral-500":
                      lockKey,
                  },
                )}
                {...register("key", { required: true })}
                disabled={lockKey}
              />
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
